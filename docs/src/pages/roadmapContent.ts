export type RoadmapStatus = 'done' | 'in-progress' | 'planned' | 'at-risk';
export type RoadmapPhase = 'now' | 'next' | 'later';

export interface RoadmapItem {
    id: string;
    title: { en: string; th: string };
    description: { en: string; th: string };
    status: RoadmapStatus;
    eta?: string;
}

export interface RoadmapPhaseData {
    id: RoadmapPhase;
    title: { en: string; th: string };
    subtitle: { en: string; th: string };
    items: RoadmapItem[];
}

export const roadmapPhases: RoadmapPhaseData[] = [
    {
        id: 'now',
        title: {
            en: 'Now',
            th: 'ตอนนี้'
        },
        subtitle: {
            en: 'v3.7.x — actively in flight',
            th: 'v3.7.x — กำลังทำอยู่'
        },
        items: [
            {
                id: 'plugin-system',
                title: {
                    en: 'Plugin system',
                    th: 'ระบบ Plugin'
                },
                description: {
                    en: 'Formal API to extend dev/build/preview — hooks for beforeBuild, afterBuild, transformIndexHtml, and configureServer.',
                    th: 'API ที่เป็นทางการสำหรับขยาย dev/build/preview — hooks สำหรับ beforeBuild, afterBuild, transformIndexHtml และ configureServer'
                },
                status: 'in-progress',
                eta: 'v3.8'
            },
            {
                id: 'type-safe-rpc',
                title: {
                    en: 'Type-safe RPC',
                    th: 'RPC แบบ Type-safe'
                },
                description: {
                    en: 'Auto-derive client types from ServerRouter declarations so frontend calls match backend handlers — no more drift.',
                    th: 'สร้าง client types อัตโนมัติจาก ServerRouter เพื่อให้ฝั่ง frontend เรียก backend ได้ถูกต้อง — ไม่มี drift อีก'
                },
                status: 'in-progress',
                eta: 'v3.8'
            },
            {
                id: 'docs-onboarding',
                title: {
                    en: 'Docs onboarding refresh',
                    th: 'ปรับปรุง onboarding เอกสาร'
                },
                description: {
                    en: 'Quick Start to first running app in under 2 minutes. Cover the alias/HMR/blockFiles defaults that ship out of the box.',
                    th: 'Quick Start ให้ได้แอปรันแรกใน 2 นาที พร้อมอธิบายค่า default ของ alias/HMR/blockFiles ที่มากับระบบ'
                },
                status: 'in-progress'
            }
        ]
    },
    {
        id: 'next',
        title: {
            en: 'Next',
            th: 'ถัดไป'
        },
        subtitle: {
            en: 'v3.8 – v4.0 — medium-term',
            th: 'v3.8 – v4.0 — ระยะกลาง'
        },
        items: [
            {
                id: 'streaming-ssr',
                title: {
                    en: 'Streaming SSR',
                    th: 'Streaming SSR'
                },
                description: {
                    en: 'Async-generator SSR with suspense-style fallbacks. Today ssr() returns a single string; we want progressive hydration.',
                    th: 'SSR แบบ async generator พร้อม suspense-style fallbacks ปัจจุบัน ssr() คืน string เดียว เราต้องการ progressive hydration'
                },
                status: 'planned',
                eta: 'v3.9'
            },
            {
                id: 'edge-runtimes',
                title: {
                    en: 'Edge runtime adapters',
                    th: 'Adapter สำหรับ Edge runtime'
                },
                description: {
                    en: 'Run Elit servers on Cloudflare Workers, Vercel Edge, and Deno Deploy. Today only Node, Bun, and Deno full runtimes.',
                    th: 'รัน Elit server บน Cloudflare Workers, Vercel Edge และ Deno Deploy ปัจจุบันรองรับเฉพาะ Node, Bun และ Deno full runtime'
                },
                status: 'planned',
                eta: 'v3.10'
            },
            {
                id: 'auth-helpers',
                title: {
                    en: 'Auth helpers',
                    th: 'ตัวช่วย Auth'
                },
                description: {
                    en: 'Built-in session, JWT, and OAuth helpers wired to ServerRouter middleware so login flows are not reinvented per project.',
                    th: 'ตัวช่วย session, JWT และ OAuth ในตัว ผูกกับ middleware ของ ServerRouter เพื่อไม่ต้องเขียน login flow ใหม่ทุกโปรเจกต์'
                },
                status: 'planned'
            },
            {
                id: 'pwa-automation',
                title: {
                    en: 'PWA automation',
                    th: 'อัตโนมัติ PWA'
                },
                description: {
                    en: 'Generate manifest and service worker from elit.config.ts during build — install-to-home-screen with zero extra setup.',
                    th: 'สร้าง manifest และ service worker จาก elit.config.ts ตอน build — ติดตั้ง home-screen ได้โดยไม่ต้องตั้งค่าเพิ่ม'
                },
                status: 'planned'
            },
            {
                id: 'devtools-panel',
                title: {
                    en: 'DevTools panel',
                    th: 'แผง DevTools'
                },
                description: {
                    en: 'In-page overlay for inspecting reactive state, route timeline, and server HMR events. Faster debugging than console.log.',
                    th: 'Overlay ในหน้าสำหรับดู reactive state, route timeline และ server HMR events — debug เร็วกว่า console.log'
                },
                status: 'planned'
            }
        ]
    },
    {
        id: 'later',
        title: {
            en: 'Later',
            th: 'ในอนาคต'
        },
        subtitle: {
            en: 'v4.0+ — long-term vision',
            th: 'v4.0+ — วิสัยทัศน์ระยะยาว'
        },
        items: [
            {
                id: 'gtk4-migration',
                title: {
                    en: 'GTK4 desktop migration',
                    th: 'ย้าย desktop ไป GTK4'
                },
                description: {
                    en: 'Closes the glib upstream blocker. Currently blocked on wry/webkit2gtk migrating off deprecated GTK3 bindings (RUSTSEC-2024-0420).',
                    th: 'ปิดช่องโหว่ glib upstream ปัจจุบันติดขัดเพราะ wry/webkit2gtk ยังใช้ GTK3 bindings ที่ deprecated แล้ว (RUSTSEC-2024-0420)'
                },
                status: 'at-risk',
                eta: 'upstream-dependent'
            },
            {
                id: 'migration-tooling',
                title: {
                    en: 'Migration tooling',
                    th: 'เครื่องมือย้ายระบบ'
                },
                description: {
                    en: 'Codemods for converting React, Vue, and Svelte components into Elit reactive primitives — lower the switching cost.',
                    th: 'Codemod สำหรับแปลง component จาก React, Vue และ Svelte เป็น reactive primitive ของ Elit — ลดต้นทุนการย้ายระบบ'
                },
                status: 'planned'
            },
            {
                id: 'mobile-hot-reload',
                title: {
                    en: 'Mobile hot reload',
                    th: 'Hot reload บนมือถือ'
                },
                description: {
                    en: 'elit mobile sync watches and pushes changes to a running device without a full rebuild. Cut iteration time on iOS/Android.',
                    th: 'elit mobile sync เฝ้า watch แล้ว push การเปลี่ยนแปลงไปยัง device ที่รันอยู่โดยไม่ต้อง rebuild — ลดเวลา iterate บน iOS/Android'
                },
                status: 'planned'
            },
            {
                id: 'plugin-marketplace',
                title: {
                    en: 'Plugin marketplace',
                    th: 'Marketplace สำหรับ Plugin'
                },
                description: {
                    en: 'Community plugins, version-pinned against Elit releases. Depends on the plugin system shipping first.',
                    th: 'Plugin จาก community ที่ version-pin กับ release ของ Elit ขึ้นอยู่กับ plugin system ที่ต้องออกก่อน'
                },
                status: 'planned'
            }
        ]
    }
];
