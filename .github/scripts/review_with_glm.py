import os
import sys
import requests
import json

# ดึงค่าจาก Environment Variables
ZHIPU_API_KEY = os.environ.get("ZHIPU_API_KEY")
GH_PAT = os.environ.get("GH_PAT")
PR_NUMBER = os.environ.get("PR_NUMBER")
REPO = os.environ.get("REPO") # format: owner/repo

# 1. ดึงไฟล์ที่ถูกเปลี่ยนแปลง (Diff) จาก GitHub API
def get_pr_diff():
    url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/files"
    headers = {
        "Authorization": f"token {GH_PAT}",
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"GitHub API error: {response.status_code} {response.text[:500]}")
        return ""

    files = response.json()

    # ถ้า response ไม่ใช่ list (เช่น error object)
    if not isinstance(files, list):
        print(f"Unexpected GitHub API response: {json.dumps(files)[:500]}")
        return ""
    
    # รวบรวมชื่อไฟล์และ patch (ส่วนที่แก้ไข) แต่ถ้าไฟล์ใหญ่มากอาจต้องตัดบรรทัด
    diff_content = ""
    max_chars = 30000  # จำกัดขนาด diff เพื่อไม่ให้เกิน token limit
    for file in files:
        if file.get('patch'):
            diff_content += f"File: {file['filename']}\n{file['patch']}\n\n"
            if len(diff_content) > max_chars:
                diff_content = diff_content[:max_chars] + "\n\n... (diff truncated)"
                break
    return diff_content

# 2. ส่งข้อมูลไปถาม GLM (Zhipu AI)
def ask_glm(diff_text):
    url = "https://api.z.ai/api/coding/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "glm-4-flash",
        "messages": [
            {
                "role": "user", 
                "content": f"คุณเป็น Code Reviewer ที่เก่งที่สุด กรุณาตรวจสอบโค้ดด้านล่างนี้ (Diff) และแนะนำการปรับปรุง พร้อมทั้งชี้ช่องโหว่ความปลอดภัยหากมี ตอบเป็นภาษาไทย:\n\n{diff_text}"
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"GLM API error: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        return f"⚠️ GLM API returned status {response.status_code}. Response: {response.text[:200]}"

    data = response.json()

    if 'choices' not in data:
        print(f"Unexpected GLM response: {json.dumps(data)[:500]}")
        return f"⚠️ Unexpected GLM API response format: {json.dumps(data)[:200]}"

    return data['choices'][0]['message']['content']

# 3. โพสต์คำตอบกลับลงใน GitHub PR
def post_comment_to_pr(message):
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"token {GH_PAT}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "body": f"## 🤖 GLM Code Review Bot\n\n{message}"
    }
    resp = requests.post(url, headers=headers, json=data)
    if resp.status_code in (200, 201):
        print("Comment posted successfully.")
    else:
        print(f"Failed to post comment: {resp.status_code} {resp.text[:300]}")

# --- Main Execution ---
if __name__ == "__main__":
    if not all([ZHIPU_API_KEY, GH_PAT, PR_NUMBER, REPO]):
        print("Missing required environment variables. Set ZHIPU_API_KEY, GH_PAT, PR_NUMBER, REPO.")
        sys.exit(1)

    print("Fetching PR diff...")
    diff = get_pr_diff()
    
    if not diff:
        print("No diff found or diff is too large.")
    else:
        print(f"Diff size: {len(diff)} chars. Sending to GLM...")
        review_result = ask_glm(diff)
        
        print("Posting comment to GitHub...")
        post_comment_to_pr(review_result)
        print("Done!")