/// <reference path="../../packages/test/src/globals.d.ts" />

import { a, audio, br, button, canvas, div, frag, h1, h2, head, hr, iframe, img, input, li, main, mathMath, mathMi, meta, option, optgroup, p, progress, select, slot, span, svgCircle, svgEllipse, svgLine, svgPath, svgPolygon, svgPolyline, svgRect, svgSvg, table, tbody, td, template, textarea, tr, ul, video } from '../../packages/el/src';
import { renderAndroidCompose, renderMaterializedNativeTree, renderNativeJson, renderNativeTree, renderSwiftUI } from '../../packages/native/src';
import { bindChecked, bindValue, createState } from '../../packages/state/src';
import styles from '../../packages/style/src';
import { createUniversalBridgeProps, createUniversalLinkProps, mergeUniversalProps } from '../../packages/universal/src';

describe('native target foundation', () => {
    beforeEach(() => {
        styles.clear();
    });

    afterEach(() => {
        styles.clear();
    });

    it('converts existing Elit syntax into serializable native IR', () => {
        const tree = renderNativeTree(
            div(
                { className: ['screen', 'stack'], style: { padding: '16px' } },
                h1('Hello Elit Native'),
                span('Shared syntax'),
                button({ onClick: () => undefined }, 'Tap me'),
                input({ value: 'abc', placeholder: 'Search' }),
                input({ type: 'checkbox', checked: true }),
                img({ src: './logo.png', alt: 'Logo' }),
                ul(li('One'), li('Two')),
                frag('Tail')
            ),
            { platform: 'android' }
        );

        expect(tree.platform).toBe('android');
        expect(tree.roots).toHaveLength(1);

        const [screen] = tree.roots;
        expect(screen.kind).toBe('element');
        if (screen.kind !== 'element') {
            throw new Error('Expected root element node');
        }

        expect(screen.component).toBe('View');
        expect(screen.props.classList).toEqual(['screen', 'stack']);
        expect(screen.children[0]).toEqual({
            kind: 'element',
            component: 'Text',
            sourceTag: 'h1',
            props: {},
            events: [],
            children: [{ kind: 'text', value: 'Hello Elit Native' }],
        });

        const buttonNode = screen.children[2];
        expect(buttonNode).toEqual({
            kind: 'element',
            component: 'Button',
            sourceTag: 'button',
            props: {},
            events: ['press'],
            children: [
                {
                    kind: 'element',
                    component: 'Text',
                    sourceTag: '#text',
                    props: {},
                    events: [],
                    children: [{ kind: 'text', value: 'Tap me' }],
                },
            ],
        });

        const inputNode = screen.children[3];
        expect(inputNode).toEqual({
            kind: 'element',
            component: 'TextInput',
            sourceTag: 'input',
            props: { value: 'abc', placeholder: 'Search' },
            events: [],
            children: [],
        });

        const toggleNode = screen.children[4];
        expect(toggleNode).toEqual({
            kind: 'element',
            component: 'Toggle',
            sourceTag: 'input',
            props: { checked: true },
            events: [],
            children: [],
        });

        const imageNode = screen.children[5];
        expect(imageNode).toEqual({
            kind: 'element',
            component: 'Image',
            sourceTag: 'img',
            props: { source: './logo.png', alt: 'Logo' },
            events: [],
            children: [],
        });
    });

    it('renders native IR as stable JSON output', () => {
        const json = renderNativeJson(div('Hello'));
        expect(json).toContain('"component": "View"');
        expect(json).toContain('"component": "Text"');
        expect(json).toContain('"value": "Hello"');
    });

    it('omits document-only tags and preserves slot and br passthrough in native IR', () => {
        const tree = renderNativeTree(
            div(
                head(meta({ charset: 'utf-8' })),
                slot(span('Slot body')),
                'Line',
                br(),
                'Break',
                template(span('Hidden template')),
            ),
            { platform: 'android' },
        );

        const [root] = tree.roots;
        expect(root?.kind).toBe('element');
        if (!root || root.kind !== 'element') {
            throw new Error('Expected root element node');
        }

        expect(root.children).toHaveLength(4);
        expect(root.children[0]).toEqual({
            kind: 'element',
            component: 'Text',
            sourceTag: 'span',
            props: {},
            events: [],
            children: [{ kind: 'text', value: 'Slot body' }],
        });
        expect(root.children[1]).toEqual({
            kind: 'element',
            component: 'Text',
            sourceTag: '#text',
            props: {},
            events: [],
            children: [{ kind: 'text', value: 'Line' }],
        });
        expect(root.children[2]).toEqual({
            kind: 'element',
            component: 'Text',
            sourceTag: '#text',
            props: {},
            events: [],
            children: [{ kind: 'text', value: '\n' }],
        });
        expect(root.children[3]).toEqual({
            kind: 'element',
            component: 'Text',
            sourceTag: '#text',
            props: {},
            events: [],
            children: [{ kind: 'text', value: 'Break' }],
        });
    });

    it('classifies svg and math factories as dedicated native surfaces', () => {
        const tree = renderNativeTree(
            div(
                svgSvg(svgCircle({ cx: 10, cy: 10, r: 5 })),
                mathMath(mathMi('x')),
            ),
            { platform: 'android' },
        );

        const [root] = tree.roots;
        expect(root?.kind).toBe('element');
        if (!root || root.kind !== 'element') {
            throw new Error('Expected root element node');
        }

        expect(root.children[0]).toMatchObject({ kind: 'element', component: 'Vector', sourceTag: 'svg' });
        expect(root.children[1]).toMatchObject({ kind: 'element', component: 'Math', sourceTag: 'math' });

        const compose = renderAndroidCompose(
            div(
                svgSvg(svgCircle({ cx: 10, cy: 10, r: 5 })),
                mathMath(mathMi('x')),
            ),
            { functionName: 'VectorMathScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                svgSvg(svgCircle({ cx: 10, cy: 10, r: 5 })),
                mathMath(mathMi('x')),
            ),
            { structName: 'VectorMathScreen' },
        );

        expect(compose).toContain('androidx.compose.foundation.Canvas(modifier = Modifier.size(width = 24.dp, height = 24.dp))');
        expect(compose).toContain('drawCircle(color = Color(red = 0f, green = 0f, blue = 0f, alpha = 1f)');
        expect(compose).toContain('ElitUnsupported(');
        expect(compose).toContain('label = "Math"');

        expect(swiftui).toContain('Canvas { context, size in');
        expect(swiftui).toContain('vectorPath0.addEllipse(in: CGRect(');
        expect(swiftui).toContain('elitUnsupportedPlaceholder(label: "Math", sourceTag: "math")');
    });

    it('renders the first svg subset into native vector canvas output', () => {
        const compose = renderAndroidCompose(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgCircle({ cx: 12, cy: 12, r: 10, fill: '#d56e43' }),
                    svgRect({ x: 2, y: 2, width: 6, height: 4, stroke: '#261914', strokeWidth: 1 }),
                    svgPath({ d: 'M 4 20 L 20 20 L 12 8 Z', fill: 'goldenrod' }),
                ),
            ),
            { functionName: 'VectorSubsetScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgCircle({ cx: 12, cy: 12, r: 10, fill: '#d56e43' }),
                    svgRect({ x: 2, y: 2, width: 6, height: 4, stroke: '#261914', strokeWidth: 1 }),
                    svgPath({ d: 'M 4 20 L 20 20 L 12 8 Z', fill: 'goldenrod' }),
                ),
            ),
            { structName: 'VectorSubsetScreen' },
        );

        expect(compose).toContain('androidx.compose.foundation.Canvas(modifier = Modifier.size(width = 24.dp, height = 24.dp))');
        expect(compose).toContain('drawCircle(color = Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f)');
        expect(compose).toContain('drawRect(color = Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 1f)');
        expect(compose).toContain('val vectorPath0 = androidx.compose.ui.graphics.Path().apply {');

        expect(swiftui).toContain('Canvas { context, size in');
        expect(swiftui).toContain('vectorPath0.addEllipse(in: CGRect(');
        expect(swiftui).toContain('vectorPath1.addRect(CGRect(');
        expect(swiftui).toContain('vectorPath2.move(to: CGPoint(');
        expect(swiftui).toContain('context.fill(vectorPath2, with: .color(Color(red: 0.855, green: 0.647, blue: 0.125, opacity: 1)))');
    });

    it('renders expanded svg primitives into native vector canvas output', () => {
        const compose = renderAndroidCompose(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgLine({ x1: 1, y1: 2, x2: 11, y2: 3, stroke: '#123456', strokeWidth: 2 }),
                    svgPolyline({ points: '2,20 8,14 12,18 18,10', stroke: '#008000', fill: 'none', strokeWidth: 1.5 }),
                    svgPolygon({ points: '14,4 20,8 18,14 12,12', fill: '#ff8c00' }),
                    svgEllipse({ cx: 6, cy: 7, rx: 3, ry: 2, fill: '#0f1419', stroke: '#d56e43', strokeWidth: 1 }),
                ),
            ),
            { functionName: 'ExpandedVectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgLine({ x1: 1, y1: 2, x2: 11, y2: 3, stroke: '#123456', strokeWidth: 2 }),
                    svgPolyline({ points: '2,20 8,14 12,18 18,10', stroke: '#008000', fill: 'none', strokeWidth: 1.5 }),
                    svgPolygon({ points: '14,4 20,8 18,14 12,12', fill: '#ff8c00' }),
                    svgEllipse({ cx: 6, cy: 7, rx: 3, ry: 2, fill: '#0f1419', stroke: '#d56e43', strokeWidth: 1 }),
                ),
            ),
            { structName: 'ExpandedVectorScreen' },
        );

        expect(compose).not.toContain('ElitUnsupported(');
        expect(compose).toContain('drawOval(color = Color(red = 0.059f, green = 0.078f, blue = 0.098f, alpha = 1f)');
        expect(compose).toContain('drawOval(color = Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f)');
        expect(compose).toContain('moveTo(1f * scaleX, 2f * scaleY)');
        expect(compose).toContain('lineTo(11f * scaleX, 3f * scaleY)');
        expect(compose).toContain('close()');

        expect(swiftui).not.toContain('elitUnsupportedPlaceholder(label: "Vector", sourceTag: "svg")');
        expect(swiftui).toContain('vectorPath0.move(to: CGPoint(x: CGFloat(1) * scaleX, y: CGFloat(2) * scaleY))');
        expect(swiftui).toContain('vectorPath0.addLine(to: CGPoint(x: CGFloat(11) * scaleX, y: CGFloat(3) * scaleY))');
        expect(swiftui).toContain('vectorPath2.closeSubpath()');
        expect(swiftui).toContain('vectorPath3.addEllipse(in: CGRect(x: CGFloat(3) * scaleX, y: CGFloat(5) * scaleY, width: CGFloat(6) * scaleX, height: CGFloat(4) * scaleY))');
    });

    it('renders cubic quadratic and arc svg path commands into native vector output', () => {
        const compose = renderAndroidCompose(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgPath({ d: 'M 2 12 C 6 2 18 2 22 12 Q 18 22 10 18 A 4 4 0 0 1 6 14 Z', fill: 'none', stroke: '#123456', strokeWidth: 1.5 }),
                ),
            ),
            { functionName: 'ComplexPathScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgPath({ d: 'M 2 12 C 6 2 18 2 22 12 Q 18 22 10 18 A 4 4 0 0 1 6 14 Z', fill: 'none', stroke: '#123456', strokeWidth: 1.5 }),
                ),
            ),
            { structName: 'ComplexPathScreen' },
        );

        expect(compose).not.toContain('ElitUnsupported(');
        expect(compose).toContain('cubicTo(6f * scaleX, 2f * scaleY, 18f * scaleX, 2f * scaleY, 22f * scaleX, 12f * scaleY)');
        expect(compose).toContain('cubicTo(19.333f * scaleX, 18.667f * scaleY, 15.333f * scaleX, 20.667f * scaleY, 10f * scaleX, 18f * scaleY)');
        expect(compose).toContain('cubicTo(7.791f * scaleX, 18f * scaleY, 6f * scaleX, 16.209f * scaleY, 6f * scaleX, 14f * scaleY)');
        expect(compose).toContain('style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.5f * strokeScale)');

        expect(swiftui).not.toContain('elitUnsupportedPlaceholder(label: "Vector", sourceTag: "svg")');
        expect(swiftui).toContain('vectorPath0.addCurve(to: CGPoint(x: CGFloat(22) * scaleX, y: CGFloat(12) * scaleY), control1: CGPoint(x: CGFloat(6) * scaleX, y: CGFloat(2) * scaleY), control2: CGPoint(x: CGFloat(18) * scaleX, y: CGFloat(2) * scaleY))');
        expect(swiftui).toContain('vectorPath0.addCurve(');
    });

    it('renders smooth cubic and smooth quadratic svg path commands into native vector output', () => {
        const compose = renderAndroidCompose(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgPath({ d: 'M 2 12 C 6 2 18 2 22 12 S 18 22 10 18 M 2 10 Q 6 2 10 10 T 18 10', fill: 'none', stroke: '#123456', strokeWidth: 1.5 }),
                ),
            ),
            { functionName: 'SmoothPathScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                svgSvg(
                    { viewBox: '0 0 24 24', width: 24, height: 24 },
                    svgPath({ d: 'M 2 12 C 6 2 18 2 22 12 S 18 22 10 18 M 2 10 Q 6 2 10 10 T 18 10', fill: 'none', stroke: '#123456', strokeWidth: 1.5 }),
                ),
            ),
            { structName: 'SmoothPathScreen' },
        );

        expect(compose).not.toContain('ElitUnsupported(');
        expect(compose).toContain('cubicTo(26f * scaleX, 22f * scaleY, 18f * scaleX, 22f * scaleY, 10f * scaleX, 18f * scaleY)');
        expect(compose).toContain('cubicTo(12.667f * scaleX, 15.333f * scaleY, 15.333f * scaleX, 15.333f * scaleY, 18f * scaleX, 10f * scaleY)');

        expect(swiftui).not.toContain('elitUnsupportedPlaceholder(label: "Vector", sourceTag: "svg")');
        expect(swiftui).toContain('control1: CGPoint(x: CGFloat(26) * scaleX, y: CGFloat(22) * scaleY), control2: CGPoint(x: CGFloat(18) * scaleX, y: CGFloat(22) * scaleY)');
        expect(swiftui).toContain('control1: CGPoint(x: CGFloat(12.667) * scaleX, y: CGFloat(15.333) * scaleY), control2: CGPoint(x: CGFloat(15.333) * scaleX, y: CGFloat(15.333) * scaleY)');
    });

    it('renders first-pass canvas surfaces with intrinsic sizing instead of placeholders', () => {
        const compose = renderAndroidCompose(
            div(
                canvas({ width: 320, height: 180 }),
                canvas(),
            ),
            { functionName: 'CanvasSurfaceScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                canvas({ width: 320, height: 180 }),
                canvas(),
            ),
            { structName: 'CanvasSurfaceScreen' },
        );

        expect(compose).toContain('androidx.compose.foundation.Canvas(modifier = Modifier.size(width = 320.dp, height = 180.dp)) {');
        expect(compose).toContain('androidx.compose.foundation.Canvas(modifier = Modifier.size(width = 300.dp, height = 150.dp)) {');
        expect(compose).not.toContain('label = "Canvas"');

        expect(swiftui).toContain('Canvas { _, _ in');
        expect(swiftui).toContain('.frame(width: 320, height: 180)');
        expect(swiftui).toContain('.frame(width: 300, height: 150)');
        expect(swiftui).not.toContain('elitUnsupportedPlaceholder(label: "Canvas", sourceTag: "canvas")');
    });

    it('renders declarative canvas draw ops into native canvas output', () => {
        const drawOps = [
            { kind: 'rect', x: 16, y: 16, width: 64, height: 32, fill: '#d56e43' },
            { kind: 'line', x1: 16, y1: 80, x2: 128, y2: 80, stroke: '#123456', strokeWidth: 2 },
            { kind: 'path', d: 'M 32 120 Q 64 96 96 120 T 160 120', fill: 'none', stroke: 'goldenrod', strokeWidth: 1.5 },
        ];

        const compose = renderAndroidCompose(
            div(canvas({ width: 200, height: 160, drawOps })),
            { functionName: 'CanvasDrawOpsScreen' },
        );

        const swiftui = renderSwiftUI(
            div(canvas({ width: 200, height: 160, drawOps })),
            { structName: 'CanvasDrawOpsScreen' },
        );

        expect(compose).toContain('androidx.compose.foundation.Canvas(modifier = Modifier.size(width = 200.dp, height = 160.dp)) {');
        expect(compose).toContain('drawRect(color = Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f)');
        expect(compose).toContain('moveTo(16f * scaleX, 80f * scaleY)');
        expect(compose).toContain('lineTo(128f * scaleX, 80f * scaleY)');
        expect(compose).toContain('cubicTo(53.333f * scaleX, 104f * scaleY, 74.667f * scaleX, 104f * scaleY, 96f * scaleX, 120f * scaleY)');
        expect(compose).not.toContain('label = "Canvas"');

        expect(swiftui).toContain('Canvas { context, size in');
        expect(swiftui).toContain('vectorPath0.addRect(CGRect(x: CGFloat(16) * scaleX, y: CGFloat(16) * scaleY, width: CGFloat(64) * scaleX, height: CGFloat(32) * scaleY))');
        expect(swiftui).toContain('vectorPath1.addLine(to: CGPoint(x: CGFloat(128) * scaleX, y: CGFloat(80) * scaleY))');
        expect(swiftui).toContain('control1: CGPoint(x: CGFloat(53.333) * scaleX, y: CGFloat(104) * scaleY), control2: CGPoint(x: CGFloat(74.667) * scaleX, y: CGFloat(104) * scaleY)');
        expect(swiftui).not.toContain('elitUnsupportedPlaceholder(label: "Canvas", sourceTag: "canvas")');
    });

    it('renders Jetpack Compose code from the same Elit syntax', () => {
        const compose = renderAndroidCompose(
            div(
                { style: { padding: '16px' } },
                h1('Hello Native'),
                input({ value: 'abc', placeholder: 'Search' }),
                input({ type: 'checkbox', checked: true }),
                a({ href: 'https://elit.dev/docs' }, 'Docs'),
                button({ onClick: () => undefined }, 'Tap me'),
                img({ src: './logo.png', alt: 'Logo' })
            ),
            { functionName: 'GeneratedScreen', includePreview: true }
        );

        expect(compose).toContain('fun GeneratedScreen()');
        expect(compose).toContain('val uriHandler = LocalUriHandler.current');
        expect(compose).toContain('Column(modifier = Modifier.padding(16.dp))');
        expect(compose).toContain('Text(text = "Hello Native")');
        expect(compose).toContain('BasicTextField(');
        expect(compose).toContain('Checkbox(');
        expect(compose).toContain('uriHandler.openUri("https://elit.dev/docs")');
        expect(compose).toContain('Box(modifier = Modifier.clickable { uriHandler.openUri("https://elit.dev/docs") }.semantics(mergeDescendants = true) { contentDescription = "Docs"; stateDescription = "Opens externally" }, contentAlignment = Alignment.Center)');
        expect(compose).toContain('// TODO: wire elit event(s): press');
        expect(compose).toContain('Box(modifier = Modifier.clickable { /* TODO: wire elit event(s): press */ }, contentAlignment = Alignment.Center)');
        expect(compose).toContain('ElitImageSurface(');
        expect(compose).toContain('source = "./logo.png"');
        expect(compose).toContain('label = "LO"');
        expect(compose).toContain('@Preview(showBackground = true)');
    });

    it('renders SwiftUI code from the same Elit syntax', () => {
        const swiftui = renderSwiftUI(
            div(
                { style: { padding: '16px' } },
                h1('Hello Native'),
                input({ value: 'abc', placeholder: 'Search' }),
                input({ type: 'checkbox', checked: true }),
                a({ href: 'https://elit.dev/docs' }, 'Docs'),
                button({ onClick: () => undefined }, 'Tap me'),
                img({ src: './logo.png', alt: 'Logo' })
            ),
            { structName: 'GeneratedScreen', includePreview: true }
        );

        expect(swiftui).toContain('import Foundation');
        expect(swiftui).toContain('struct GeneratedScreen: View');
        expect(swiftui).toContain('@Environment(\\.openURL) private var openURL');
        expect(swiftui).toContain('@State private var textFieldValue0 = "abc"');
        expect(swiftui).toContain('@State private var toggleValue0 = true');
        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 12) {');
        expect(swiftui).toContain('Text("Hello Native")');
        expect(swiftui).toContain('TextField("Search", text: $textFieldValue0)');
        expect(swiftui).toContain('Toggle("", isOn: $toggleValue0)');
        expect(swiftui).toContain('if let destination = URL(string: "https://elit.dev/docs") {');
        expect(swiftui).toContain('Button(action: {');
        expect(swiftui).toContain('elitImageSurface(source: "./logo.png", label: "LO", alt: "Logo")');
        expect(swiftui).toContain('#Preview {');
    });

    it('renders screen roots as scrollable containers and uses refined image fallback labels', () => {
        const compose = renderAndroidCompose(
            main(img({ src: './public/favicon.svg', alt: 'Elit Universal Example icon' })),
            { functionName: 'ScrollableScreen' },
        );

        const swiftui = renderSwiftUI(
            main(img({ src: './public/favicon.svg', alt: 'Elit Universal Example icon' })),
            { structName: 'ScrollableScreen' },
        );

        expect(compose).toContain('Modifier.fillMaxSize().verticalScroll(rememberScrollState())');
        expect(compose).toContain('ElitImageSurface(');
        expect(compose).toContain('label = "EU"');

        expect(swiftui).toContain('ScrollView {');
        expect(swiftui).toContain('elitImageSurface(source: "./public/favicon.svg", label: "EU", alt: "Elit Universal Example icon")');
    });

    it('maps first-pass image surfaces with practical object-fit and object-position into native output', () => {
        styles.addClass('hero-image', {
            width: '240px',
            height: '140px',
            borderRadius: '24px',
            objectFit: 'contain',
            objectPosition: 'top left',
        });

        const compose = renderAndroidCompose(
            div(img({ className: 'hero-image', src: 'https://elit.dev/media/hero.png', alt: 'Hero image' })),
            { functionName: 'ImageSurfaceScreen' },
        );

        const swiftui = renderSwiftUI(
            div(img({ className: 'hero-image', src: 'https://elit.dev/media/hero.png', alt: 'Hero image' })),
            { structName: 'ImageSurfaceScreen' },
        );

        expect(compose).toContain('ElitImageSurface(');
        expect(compose).toContain('source = "https://elit.dev/media/hero.png"');
        expect(compose).toContain('label = "HE"');
        expect(compose).toContain('objectFit = "contain"');
        expect(compose).toContain('objectPosition = "top-leading"');
        expect(compose).toContain('private fun ElitImageSurface(source: String, label: String, contentDescription: String?, objectFit: String = "cover", objectPosition: String = "center", modifier: Modifier = Modifier) {');
        expect(compose).toContain('elitLoadBackgroundBitmap(this, source, "no-repeat", objectFit, objectPosition)');

        expect(swiftui).toContain('elitImageSurface(source: "https://elit.dev/media/hero.png", label: "HE", alt: "Hero image", objectFit: "contain", objectPosition: "top-leading")');
        expect(swiftui).toContain('private func elitImageSurface(source: String, label: String, alt: String?, objectFit: String = "cover", objectPosition: String = "center") -> some View {');
        expect(swiftui).toContain('elitBackgroundImage(image, backgroundSize: objectFit, backgroundPosition: objectPosition, backgroundRepeat: "no-repeat")');
    });

    it('maps select, progress, hr, and simple table cells into native output', () => {
        const compose = renderAndroidCompose(
            div(
                select(optgroup({ label: 'Primary' }, option('One'), option({ selected: true }, 'Two'))),
                progress({ value: 25, max: 100 }),
                hr(),
                table(tbody(tr(td('A'), td('B')))),
            ),
            { functionName: 'ElementCoverageScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                select(optgroup({ label: 'Primary' }, option('One'), option({ selected: true }, 'Two'))),
                progress({ value: 25, max: 100 }),
                hr(),
                table(tbody(tr(td('A'), td('B')))),
            ),
            { structName: 'ElementCoverageScreen' },
        );

        expect(compose).toContain('var pickerValue0 by remember { mutableStateOf("Two") }');
        expect(compose).toContain('var pickerExpanded0 by remember { mutableStateOf(false) }');
        expect(compose).toContain('DropdownMenu(expanded = pickerExpanded0, onDismissRequest = { pickerExpanded0 = false })');
        expect(compose).toContain('DropdownMenuItem(text = { Text(text = "One") }, onClick = { pickerValue0 = "One"; pickerExpanded0 = false })');
        expect(compose).toContain('LinearProgressIndicator(progress = 0.25f, modifier = Modifier)');
        expect(compose).toContain('HorizontalDivider(modifier = Modifier)');
        expect(compose).toContain('Column(modifier = Modifier.weight(1f, fill = true)) {');

        expect(swiftui).toContain('@State private var pickerValue0 = "Two"');
        expect(swiftui).toContain('Picker("", selection: $pickerValue0) {');
        expect(swiftui).toContain('Text("Two").tag("Two")');
        expect(swiftui).toContain('ProgressView(value: 0.25)');
        expect(swiftui).toContain('Divider()');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
    });

    it('renders first-pass webview and media surfaces instead of generic placeholders', () => {
        const compose = renderAndroidCompose(
            div(
                iframe({ src: 'https://example.com/embed' }),
                video({ src: 'https://cdn.example.com/demo.mp4', autoplay: true }, 'Demo video'),
                audio({ src: 'https://cdn.example.com/theme.mp3' }, 'Theme audio'),
            ),
            { functionName: 'SurfaceScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                iframe({ src: 'https://example.com/embed' }),
                video({ src: 'https://cdn.example.com/demo.mp4', autoplay: true }, 'Demo video'),
                audio({ src: 'https://cdn.example.com/theme.mp3' }, 'Theme audio'),
            ),
            { structName: 'SurfaceScreen' },
        );

        expect(compose).toContain('ElitWebViewSurface(source = "https://example.com/embed", label = "Web content", modifier = Modifier)');
        expect(compose).toContain('ElitVideoSurface(source = "https://cdn.example.com/demo.mp4", label = "Demo video", autoPlay = true, loop = false, muted = false, controls = false, poster = null, playsInline = false, modifier = Modifier)');
        expect(compose).toContain('ElitAudioSurface(source = "https://cdn.example.com/theme.mp3", label = "Theme audio", autoPlay = false, loop = false, muted = false, modifier = Modifier)');
        expect(compose).toContain('private fun ElitWebViewSurface(source: String, label: String?, modifier: Modifier = Modifier) {');
        expect(compose).toContain('private fun ElitVideoSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, controls: Boolean, poster: String?, playsInline: Boolean, posterFit: String = "cover", posterPosition: String = "center", modifier: Modifier = Modifier) {');
        expect(compose).toContain('private fun ElitAudioSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, modifier: Modifier = Modifier) {');

        expect(swiftui).toContain('import WebKit');
        expect(swiftui).toContain('import AVKit');
        expect(swiftui).toContain('ElitWebViewSurface(source: "https://example.com/embed", label: "Web content")');
        expect(swiftui).toContain('ElitVideoSurface(source: "https://cdn.example.com/demo.mp4", label: "Demo video", autoPlay: true, muted: false, controls: false, poster: nil, playsInline: false)');
        expect(swiftui).toContain('ElitAudioSurface(source: "https://cdn.example.com/theme.mp3", label: "Theme audio", autoPlay: false, muted: false)');
        expect(swiftui).toContain('struct ElitWebViewSurface: UIViewRepresentable {');
        expect(swiftui).toContain('struct ElitVideoSurface: View {');
        expect(swiftui).toContain('struct ElitAudioSurface: View {');
    });

    it('propagates muted state and accessibility labels into native surface helpers', () => {
        const compose = renderAndroidCompose(
            div(
                iframe({ src: 'https://example.com/embed', title: 'Account console' }),
                video({ src: 'https://cdn.example.com/promo.mp4', autoplay: true, loop: true, muted: true, 'aria-label': 'Promo clip' }),
                audio({ src: 'https://cdn.example.com/ambient.mp3', muted: true, title: 'Ambient track' }),
            ),
            { functionName: 'AccessibleSurfaceScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                iframe({ src: 'https://example.com/embed', title: 'Account console' }),
                video({ src: 'https://cdn.example.com/promo.mp4', autoplay: true, loop: true, muted: true, 'aria-label': 'Promo clip' }),
                audio({ src: 'https://cdn.example.com/ambient.mp3', muted: true, title: 'Ambient track' }),
            ),
            { structName: 'AccessibleSurfaceScreen' },
        );

        expect(compose).toContain('ElitWebViewSurface(source = "https://example.com/embed", label = "Account console", modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "Account console" })');
        expect(compose).toContain('ElitVideoSurface(source = "https://cdn.example.com/promo.mp4", label = "Promo clip", autoPlay = true, loop = true, muted = true, controls = false, poster = null, playsInline = false, modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "Promo clip" })');
        expect(compose).toContain('ElitAudioSurface(source = "https://cdn.example.com/ambient.mp3", label = "Ambient track", autoPlay = false, loop = false, muted = true, modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "Ambient track" })');
        expect(compose).toContain('contentDescription = label');
        expect(compose).toContain('mediaPlayer.setVolume(if (muted) 0f else 1f, if (muted) 0f else 1f)');

        expect(swiftui).toContain('ElitWebViewSurface(source: "https://example.com/embed", label: "Account console")');
        expect(swiftui).toContain('ElitVideoSurface(source: "https://cdn.example.com/promo.mp4", label: "Promo clip", autoPlay: true, muted: true, controls: false, poster: nil, playsInline: false)');
        expect(swiftui).toContain('ElitAudioSurface(source: "https://cdn.example.com/ambient.mp3", label: "Ambient track", autoPlay: false, muted: true)');
        expect(swiftui).toContain('webView.accessibilityLabel = label');
        expect(swiftui).toContain('resolvedPlayer.isMuted = muted');
        expect(swiftui).toContain('.accessibilityLabel(label)');
    });

    it('maps video controls poster and playsinline attrs into native surface helpers', () => {
        const compose = renderAndroidCompose(
            div(
                video({ src: 'https://cdn.example.com/trailer.mp4', controls: true, poster: './poster.png', playsinline: true }, 'Trailer'),
            ),
            { functionName: 'VideoAttrSurfaceScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                video({ src: 'https://cdn.example.com/trailer.mp4', controls: true, poster: './poster.png', playsinline: true }, 'Trailer'),
            ),
            { structName: 'VideoAttrSurfaceScreen' },
        );

        expect(compose).toContain('ElitVideoSurface(source = "https://cdn.example.com/trailer.mp4", label = "Trailer", autoPlay = false, loop = false, muted = false, controls = true, poster = "./poster.png", playsInline = true, modifier = Modifier)');
        expect(compose).toContain('if (controls) {');
        expect(compose).toContain('posterView.setImageURI(android.net.Uri.parse(poster))');
        expect(compose).toContain('Android VideoView already renders inline; playsInline is retained for parity with iOS generation.');

        expect(swiftui).toContain('ElitVideoSurface(source: "https://cdn.example.com/trailer.mp4", label: "Trailer", autoPlay: false, muted: false, controls: true, poster: "./poster.png", playsInline: true)');
        expect(swiftui).toContain('struct ElitVideoPlayerController: UIViewControllerRepresentable {');
        expect(swiftui).toContain('AsyncImage(url: posterURL) { phase in');
        expect(swiftui).toContain('controller.showsPlaybackControls = controls');
        expect(swiftui).toContain('controller.entersFullScreenWhenPlaybackBegins = !playsInline');
    });

    it('maps video poster object-fit hints into native media helpers', () => {
        styles.addClass('poster-contain', {
            objectFit: 'contain',
        });

        const compose = renderAndroidCompose(
            div(
                video({ className: 'poster-contain', src: 'https://cdn.example.com/trailer.mp4', poster: './poster.png' }, 'Trailer'),
            ),
            { functionName: 'VideoPosterFitScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                video({ className: 'poster-contain', src: 'https://cdn.example.com/trailer.mp4', poster: './poster.png' }, 'Trailer'),
            ),
            { structName: 'VideoPosterFitScreen' },
        );

        expect(compose).toContain('ElitVideoSurface(source = "https://cdn.example.com/trailer.mp4", label = "Trailer", autoPlay = false, loop = false, muted = false, controls = false, poster = "./poster.png", playsInline = false, posterFit = "contain", modifier = Modifier)');
        expect(compose).toContain('private fun elitVideoPosterScaleType(posterFit: String, posterPosition: String): android.widget.ImageView.ScaleType = when (posterFit.trim().lowercase()) {');
        expect(compose).toContain('posterView.scaleType = elitVideoPosterScaleType(posterFit, posterPosition)');

        expect(swiftui).toContain('ElitVideoSurface(source: "https://cdn.example.com/trailer.mp4", label: "Trailer", autoPlay: false, muted: false, controls: false, poster: "./poster.png", playsInline: false, posterFit: "contain")');
        expect(swiftui).toContain('private func elitPosterImage(_ image: Image, posterFit: String, posterPosition: String) -> some View {');
        expect(swiftui).toContain('case "contain":');
        expect(swiftui).toContain('.scaledToFit()');
    });

    it('maps video poster object-position hints into native media helpers', () => {
        styles.addClass('poster-top-left', {
            objectFit: 'contain',
            objectPosition: 'top left',
        });

        const compose = renderAndroidCompose(
            div(
                video({ className: 'poster-top-left', src: 'https://cdn.example.com/trailer.mp4', poster: './poster.png' }, 'Trailer'),
            ),
            { functionName: 'VideoPosterPositionScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                video({ className: 'poster-top-left', src: 'https://cdn.example.com/trailer.mp4', poster: './poster.png' }, 'Trailer'),
            ),
            { structName: 'VideoPosterPositionScreen' },
        );

        expect(compose).toContain('posterPosition = "top-leading"');
        expect(compose).toContain('"top", "leading", "top-leading", "bottom-leading" -> android.widget.ImageView.ScaleType.FIT_START');
        expect(compose).toContain('posterView.scaleType = elitVideoPosterScaleType(posterFit, posterPosition)');

        expect(swiftui).toContain('posterPosition: "top-leading"');
        expect(swiftui).toContain('private func elitPosterAlignment(_ posterPosition: String) -> Alignment {');
        expect(swiftui).toContain('return .topLeading');
        expect(swiftui).toContain('alignment: elitPosterAlignment(posterPosition)');
    });

    it('falls back to explicit placeholders when webview or media surfaces have no usable source', () => {
        const compose = renderAndroidCompose(
            div(
                iframe(),
                video('Demo video without source'),
                audio({ title: 'Theme audio without source' }),
            ),
            { functionName: 'SurfaceFallbackScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                iframe(),
                video('Demo video without source'),
                audio({ title: 'Theme audio without source' }),
            ),
            { structName: 'SurfaceFallbackScreen' },
        );

        expect(compose).toContain('label = "WebView"');
        expect(compose).toContain('sourceTag = "iframe"');
        expect(compose).toContain('label = "Media"');
        expect(compose).toContain('sourceTag = "video"');
        expect(compose).toContain('sourceTag = "audio"');
        expect(compose).not.toContain('private fun ElitWebViewSurface(source: String, label: String?, modifier: Modifier = Modifier) {');
        expect(compose).not.toContain('private fun ElitVideoSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, controls: Boolean, poster: String?, playsInline: Boolean, posterFit: String = "cover", modifier: Modifier = Modifier) {');
        expect(compose).not.toContain('private fun ElitAudioSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, modifier: Modifier = Modifier) {');

        expect(swiftui).toContain('elitUnsupportedPlaceholder(label: "WebView", sourceTag: "iframe")');
        expect(swiftui).toContain('elitUnsupportedPlaceholder(label: "Media", sourceTag: "video")');
        expect(swiftui).toContain('elitUnsupportedPlaceholder(label: "Media", sourceTag: "audio")');
        expect(swiftui).not.toContain('import WebKit');
        expect(swiftui).not.toContain('import AVKit');
        expect(swiftui).not.toContain('struct ElitWebViewSurface: UIViewRepresentable {');
        expect(swiftui).not.toContain('struct ElitVideoSurface: View {');
        expect(swiftui).not.toContain('struct ElitAudioSurface: View {');
    });

    it('keeps picker values and table spacing closer to native semantics', () => {
        const choice = createState('jp');

        const compose = renderAndroidCompose(
            div(
                select(
                    { ...bindValue(choice) },
                    option({ value: 'th' }, 'Thailand'),
                    option({ value: 'jp' }, 'Japan'),
                ),
                table(tbody(tr(td('A'), td('B')))),
            ),
            { functionName: 'PickerSemanticScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                select(
                    { ...bindValue(choice) },
                    option({ value: 'th' }, 'Thailand'),
                    option({ value: 'jp' }, 'Japan'),
                ),
                table(tbody(tr(td('A'), td('B')))),
            ),
            { structName: 'PickerSemanticScreen' },
        );

        expect(compose).toContain('var nativeState0 by remember { mutableStateOf("jp") }');
        expect(compose).toContain('Text(text = when (nativeState0) { "th" -> "Thailand"; "jp" -> "Japan"; else -> nativeState0 })');
        expect(compose).toContain('DropdownMenuItem(text = { Text(text = "Thailand") }, onClick = { nativeState0 = "th"; pickerExpanded0 = false })');
        expect(compose).toContain('Column(modifier = Modifier.weight(1f, fill = true)) {');

        expect(swiftui).toContain('Picker("", selection: $nativeState0) {');
        expect(swiftui).toContain('Text("Thailand").tag("th")');
        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 0) {');
        expect(swiftui).toContain('HStack(alignment: .top, spacing: 0) {');
    });

    it('maps practical text input attrs into native control output', () => {
        const compose = renderAndroidCompose(
            div(
                input({ type: 'password', value: 'secret', placeholder: 'Password', readOnly: true, autoFocus: true }),
                input({ type: 'email', value: 'hello@example.com' }),
                input({ type: 'number', value: 42 }),
                input({ type: 'tel', value: '+66 2 123 4567' }),
                input({ type: 'url', value: 'https://example.com' }),
            ),
            { functionName: 'InputAttrScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                input({ type: 'password', value: 'secret', placeholder: 'Password', readOnly: true, autoFocus: true }),
                input({ type: 'email', value: 'hello@example.com' }),
                input({ type: 'number', value: 42 }),
                input({ type: 'tel', value: '+66 2 123 4567' }),
                input({ type: 'url', value: 'https://example.com' }),
            ),
            { structName: 'InputAttrScreen' },
        );

        expect(compose).toContain('import androidx.compose.ui.focus.focusRequester');
        expect(compose).toContain('val textFieldFocusRequester0 = remember { androidx.compose.ui.focus.FocusRequester() }');
        expect(compose).toContain('LaunchedEffect(Unit) {');
        expect(compose).toContain('textFieldFocusRequester0.requestFocus()');
        expect(compose).toContain('modifier = Modifier.focusRequester(textFieldFocusRequester0),');
        expect(compose).toContain('readOnly = true');
        expect(compose).toContain('visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation()');
        expect(compose).toContain('keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)');
        expect(compose).toContain('keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)');
        expect(compose).toContain('keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)');
        expect(compose).toContain('keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Uri)');

        expect(swiftui).toContain('@FocusState private var textFieldFocus0: Bool');
        expect(swiftui).toContain('SecureField("Password", text: Binding(get: { textFieldValue0 }, set: { _ in }))');
        expect(swiftui).toContain('.focused($textFieldFocus0)');
        expect(swiftui).toContain('.onAppear { textFieldFocus0 = true }');
        expect(swiftui).toContain('.keyboardType(.emailAddress)');
        expect(swiftui).toContain('.keyboardType(.decimalPad)');
        expect(swiftui).toContain('.keyboardType(.phonePad)');
        expect(swiftui).toContain('.keyboardType(.URL)');
        expect(swiftui).toContain('.textInputAutocapitalization(.never)');
    });

    it('dispatches practical native control events through bridge helpers', () => {
        const noop = () => undefined;

        const compose = renderAndroidCompose(
            div(
                input({ value: 'Draft', onInput: noop, onChange: noop, onSubmit: noop }),
                input({ type: 'checkbox', checked: true, onInput: noop, onChange: noop }),
                select(
                    { value: 'draft', onInput: noop, onChange: noop },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
            ),
            { functionName: 'NativeControlEventScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                input({ value: 'Draft', onInput: noop, onChange: noop, onSubmit: noop }),
                input({ type: 'checkbox', checked: true, onInput: noop, onChange: noop }),
                select(
                    { value: 'draft', onInput: noop, onChange: noop },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
            ),
            { structName: 'NativeControlEventScreen' },
        );

        expect(compose).toContain('object ElitNativeBridge {');
        expect(compose).toContain('fun controlEventPayload(event: String, sourceTag: String, inputType: String? = null, value: String? = null, values: Iterable<String>? = null, checked: Boolean? = null, detailJson: String? = null): String {');
        expect(compose).toContain('controlEventPayload(event = "input", sourceTag = "input", inputType = "text", value = nextValue)');
        expect(compose).toContain('controlEventPayload(event = "change", sourceTag = "input", inputType = "text", value = nextValue)');
        expect(compose).toContain('keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { ElitNativeBridge.dispatch(action = "elit.event.submit", payloadJson = ElitNativeBridge.controlEventPayload(event = "submit", sourceTag = "input", inputType = "text", value = textFieldValue0)) })');
        expect(compose).toContain('controlEventPayload(event = "input", sourceTag = "input", inputType = "checkbox", checked = checked)');
        expect(compose).toContain('controlEventPayload(event = "change", sourceTag = "input", inputType = "checkbox", checked = checked)');
        expect(compose).toContain('controlEventPayload(event = "input", sourceTag = "select", inputType = "select-one", value = pickerValue0)');
        expect(compose).toContain('controlEventPayload(event = "change", sourceTag = "select", inputType = "select-one", value = pickerValue0)');

        expect(swiftui).toContain('enum ElitNativeBridge {');
        expect(swiftui).toContain('static func controlEventPayload(event: String, sourceTag: String, inputType: String? = nil, value: String? = nil, values: [String]? = nil, checked: Bool? = nil, detailJson: String? = nil) -> String {');
        expect(swiftui).toContain('ElitNativeBridge.dispatch(action: "elit.event.input", payloadJson: ElitNativeBridge.controlEventPayload(event: "input", sourceTag: "input", inputType: "text", value: nextValue))');
        expect(swiftui).toContain('ElitNativeBridge.dispatch(action: "elit.event.change", payloadJson: ElitNativeBridge.controlEventPayload(event: "change", sourceTag: "input", inputType: "text", value: nextValue))');
        expect(swiftui).toContain('.onSubmit { ElitNativeBridge.dispatch(action: "elit.event.submit", payloadJson: ElitNativeBridge.controlEventPayload(event: "submit", sourceTag: "input", inputType: "text", value: textFieldValue0)) }');
        expect(swiftui).toContain('checked: nextChecked');
        expect(swiftui).toContain('controlEventPayload(event: "input", sourceTag: "select", inputType: "select-one", value: nextValue)');
        expect(swiftui).toContain('controlEventPayload(event: "change", sourceTag: "select", inputType: "select-one", value: nextValue)');
    });

    it('maps practical range inputs into native slider output', () => {
        const score = createState(42);

        const compose = renderAndroidCompose(
            div(input({ type: 'range', min: 0, max: 100, step: 5, ...bindValue(score) })),
            { functionName: 'RangeInputScreen' },
        );

        const swiftui = renderSwiftUI(
            div(input({ type: 'range', min: 0, max: 100, step: 5, ...bindValue(score) })),
            { structName: 'RangeInputScreen' },
        );

        expect(compose).toContain('var nativeState0 by remember { mutableStateOf(42.0) }');
        expect(compose).toContain('Slider(');
        expect(compose).toContain('value = nativeState0.toFloat(),');
        expect(compose).toContain('onValueChange = { nextValue -> nativeState0 = nextValue.toDouble() },');
        expect(compose).toContain('valueRange = 0f..100f,');
        expect(compose).toContain('steps = 19,');

        expect(swiftui).toContain('@State private var nativeState0: Double = 42.0');
        expect(swiftui).toContain('Slider(value: $nativeState0, in: 0...100, step: 5)');
    });

    it('maps disabled native form controls into non-interactive output', () => {
        const compose = renderAndroidCompose(
            div(
                button(
                    {
                        ...createUniversalBridgeProps({
                            action: 'validation.record',
                            route: '/native/disabled',
                            payload: { control: 'button' },
                        }),
                        disabled: true,
                    },
                    'Disabled save',
                ),
                input({ value: 'Locked', disabled: true }),
                input({ type: 'checkbox', checked: true, disabled: true }),
                select({ disabled: true }, option({ value: 'draft' }, 'Draft'), option({ value: 'published', selected: true }, 'Published')),
            ),
            { functionName: 'DisabledControlScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                button(
                    {
                        ...createUniversalBridgeProps({
                            action: 'validation.record',
                            route: '/native/disabled',
                            payload: { control: 'button' },
                        }),
                        disabled: true,
                    },
                    'Disabled save',
                ),
                input({ value: 'Locked', disabled: true }),
                input({ type: 'checkbox', checked: true, disabled: true }),
                select({ disabled: true }, option({ value: 'draft' }, 'Draft'), option({ value: 'published', selected: true }, 'Published')),
            ),
            { structName: 'DisabledControlScreen' },
        );

        expect(compose).toContain('enabled = false');
        expect(compose).toContain('Checkbox(');
        expect(compose).toContain('BasicTextField(');
        expect(compose).not.toContain('clickable { pickerExpanded0 = true }');
        expect(compose).not.toContain('object ElitNativeBridge {');

        expect(swiftui).toContain('.disabled(true)');
        expect(swiftui).toContain('Picker("", selection: $pickerValue0) {');
        expect(swiftui).not.toContain('enum ElitNativeBridge {');
    });

    it('maps required single-select placeholders and static multiple select output into native controls', () => {
        const compose = renderAndroidCompose(
            div(
                select(
                    { required: true, 'aria-label': 'Status', 'aria-description': 'Pick a status' },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
                select(
                    { multiple: true, value: ['email', 'sms'], 'aria-label': 'Channels' },
                    option({ value: 'email' }, 'Email'),
                    option({ value: 'sms' }, 'SMS'),
                    option({ value: 'push', disabled: true }, 'Push'),
                ),
            ),
            { functionName: 'SelectAttrScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                select(
                    { required: true, 'aria-label': 'Status', 'aria-description': 'Pick a status' },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
                select(
                    { multiple: true, value: ['email', 'sms'], 'aria-label': 'Channels' },
                    option({ value: 'email' }, 'Email'),
                    option({ value: 'sms' }, 'SMS'),
                    option({ value: 'push', disabled: true }, 'Push'),
                ),
            ),
            { structName: 'SelectAttrScreen' },
        );

        expect(compose).toContain('var pickerValue0 by remember { mutableStateOf("") }');
        expect(compose).toContain('contentDescription = "Status"');
        expect(compose).toContain('stateDescription = "Pick a status, Required, Invalid"');
        expect(compose).toContain('var pickerValues1 by remember { mutableStateOf(setOf("email", "sms")) }');
        expect(compose).toContain('checked = pickerValues1.contains("email")');
        expect(compose).toContain('checked = pickerValues1.contains("push")');
        expect(compose).toContain('enabled = false');

        expect(swiftui).toContain('@State private var pickerValue0 = ""');
        expect(swiftui).toContain('Text("Select").tag("")');
        expect(swiftui).toContain('@State private var pickerValues1: Set<String> = ["email", "sms"]');
        expect(swiftui).toContain('Toggle(isOn: Binding(get: { pickerValues1.contains("email") }');
        expect(swiftui).toContain('.accessibilityLabel("Status")');
        expect(swiftui).toContain('.accessibilityHint("Pick a status")');
        expect(swiftui).toContain('.accessibilityValue("Required, Invalid")');
        expect(swiftui).toContain('.disabled(true)');
    });

    it('binds multiple select arrays into native checkbox groups', () => {
        const channels = createState<string[]>(['email', 'sms']);

        const compose = renderAndroidCompose(
            div(
                select(
                    { multiple: true, ...bindValue(channels), 'aria-label': 'Channels' },
                    option({ value: 'email' }, 'Email'),
                    option({ value: 'sms' }, 'SMS'),
                    option({ value: 'push' }, 'Push'),
                ),
            ),
            { functionName: 'BoundMultiSelectScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                select(
                    { multiple: true, ...bindValue(channels), 'aria-label': 'Channels' },
                    option({ value: 'email' }, 'Email'),
                    option({ value: 'sms' }, 'SMS'),
                    option({ value: 'push' }, 'Push'),
                ),
            ),
            { structName: 'BoundMultiSelectScreen' },
        );

        expect(compose).toContain('var nativeState0 by remember { mutableStateOf(listOf("email", "sms")) }');
        expect(compose).toContain('checked = nativeState0.contains("email")');
        expect(compose).toContain('checked -> nativeState0 = listOf("email", "sms", "push").filter { candidate -> if (candidate == "push") checked else nativeState0.contains(candidate) }');

        expect(swiftui).toContain('@State private var nativeState0: [String] = ["email", "sms"]');
        expect(swiftui).toContain('Toggle(isOn: Binding(get: { nativeState0.contains("email") }, set: { isOn in nativeState0 = ["email", "sms", "push"].filter { option in option == "email" ? isOn : nativeState0.contains(option) } })) {');
    });

    it('maps download links and validation state into native accessibility output', () => {
        const compose = renderAndroidCompose(
            div(
                a(
                    {
                        href: 'https://example.com/files/report.pdf',
                        download: 'quarterly-report.pdf',
                        target: '_blank',
                        rel: 'noopener external',
                        'aria-label': 'Download report',
                    },
                    'Download report',
                ),
                input({ required: true, value: '', 'aria-label': 'Email' }),
                input({ required: true, value: 'ready', 'aria-label': 'Project code' }),
                input({ value: 'ok', 'aria-invalid': false, 'aria-label': 'Alias' }),
            ),
            { functionName: 'ValidationLinkScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                a(
                    {
                        href: 'https://example.com/files/report.pdf',
                        download: 'quarterly-report.pdf',
                        target: '_blank',
                        rel: 'noopener external',
                        'aria-label': 'Download report',
                    },
                    'Download report',
                ),
                input({ required: true, value: '', 'aria-label': 'Email' }),
                input({ required: true, value: 'ready', 'aria-label': 'Project code' }),
                input({ value: 'ok', 'aria-invalid': false, 'aria-label': 'Alias' }),
            ),
            { structName: 'ValidationLinkScreen' },
        );

        expect(compose).toContain('object ElitDownloadHandler {');
        expect(compose).toContain('ElitDownloadHandler.download(localContext, "https://example.com/files/report.pdf", "quarterly-report.pdf")');
        expect(compose).toContain('contentDescription = "Download report"');
        expect(compose).toContain('stateDescription = "Downloads file, Opens externally"');
        expect(compose).toContain('stateDescription = "Required, Invalid"');
        expect(compose).toContain('stateDescription = "Required, Valid"');
        expect(compose).toContain('stateDescription = "Valid"');

        expect(swiftui).toContain('private func elitDownloadFile(from source: String, suggestedName: String? = nil) {');
        expect(swiftui).toContain('elitDownloadFile(from: "https://example.com/files/report.pdf", suggestedName: "quarterly-report.pdf")');
        expect(swiftui).toContain('.accessibilityLabel("Download report")');
        expect(swiftui).toContain('.accessibilityHint("Downloads file, Opens externally")');
        expect(swiftui).toContain('.accessibilityValue("Required, Invalid")');
        expect(swiftui).toContain('.accessibilityValue("Required, Valid")');
        expect(swiftui).toContain('.accessibilityValue("Valid")');
    });

    it('maps practical text input constraint validation into native output', () => {
        const compose = renderAndroidCompose(
            div(
                input({ type: 'email', value: 'invalid-email', 'aria-label': 'Work email' }),
                input({ type: 'url', value: 'https://elit.dev/docs', 'aria-label': 'Docs URL' }),
                input({ type: 'number', value: '4.25', min: 5, max: 10, step: 0.5, 'aria-label': 'Score' }),
                input({ value: 'ab', minLength: 3, 'aria-label': 'Code' }),
                input({ value: 'abcdef', maxLength: 5, 'aria-label': 'Short code' }),
                input({ value: 'AB-12', pattern: '[A-Z]{3}-\\d{2}', 'aria-label': 'Ticket' }),
                input({ value: 'ABC-12', pattern: '[A-Z]{3}-\\d{2}', 'aria-label': 'Ticket ok' }),
            ),
            { functionName: 'TextConstraintScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                input({ type: 'email', value: 'invalid-email', 'aria-label': 'Work email' }),
                input({ type: 'url', value: 'https://elit.dev/docs', 'aria-label': 'Docs URL' }),
                input({ type: 'number', value: '4.25', min: 5, max: 10, step: 0.5, 'aria-label': 'Score' }),
                input({ value: 'ab', minLength: 3, 'aria-label': 'Code' }),
                input({ value: 'abcdef', maxLength: 5, 'aria-label': 'Short code' }),
                input({ value: 'AB-12', pattern: '[A-Z]{3}-\\d{2}', 'aria-label': 'Ticket' }),
                input({ value: 'ABC-12', pattern: '[A-Z]{3}-\\d{2}', 'aria-label': 'Ticket ok' }),
            ),
            { structName: 'TextConstraintScreen' },
        );

        expect(compose).toContain('contentDescription = "Work email"; stateDescription = "Invalid"');
        expect(compose).toContain('contentDescription = "Docs URL"; stateDescription = "Valid"');
        expect(compose).toContain('contentDescription = "Score"; stateDescription = "Invalid"');
        expect(compose).toContain('contentDescription = "Code"; stateDescription = "Invalid"');
        expect(compose).toContain('contentDescription = "Short code"; stateDescription = "Invalid"');
        expect(compose).toContain('contentDescription = "Ticket"; stateDescription = "Invalid"');
        expect(compose).toContain('contentDescription = "Ticket ok"; stateDescription = "Valid"');

        expect(swiftui).toContain('.accessibilityLabel("Work email")');
        expect(swiftui).toContain('.accessibilityLabel("Docs URL")');
        expect(swiftui).toContain('.accessibilityLabel("Ticket ok")');
        expect((swiftui.match(/\.accessibilityValue\("Invalid"\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
        expect((swiftui.match(/\.accessibilityValue\("Valid"\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('keeps disabled controls out of automatic native valid and invalid state output', () => {
        const compose = renderAndroidCompose(
            div(
                input({ required: true, disabled: true, value: '', 'aria-label': 'Archived code' }),
                select({ required: true, disabled: true, 'aria-label': 'Archived status' }, option({ value: 'draft' }, 'Draft')),
                input({ type: 'checkbox', required: true, disabled: true, checked: false, 'aria-label': 'Archived consent' }),
                input({ required: true, value: '', 'aria-label': 'Live code' }),
            ),
            { functionName: 'DisabledValidationStateScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                input({ required: true, disabled: true, value: '', 'aria-label': 'Archived code' }),
                select({ required: true, disabled: true, 'aria-label': 'Archived status' }, option({ value: 'draft' }, 'Draft')),
                input({ type: 'checkbox', required: true, disabled: true, checked: false, 'aria-label': 'Archived consent' }),
                input({ required: true, value: '', 'aria-label': 'Live code' }),
            ),
            { structName: 'DisabledValidationStateScreen' },
        );

        expect(compose).toContain('contentDescription = "Archived code"; stateDescription = "Required, Disabled"');
        expect(compose).toContain('contentDescription = "Archived status"; stateDescription = "Required, Disabled"');
        expect(compose).toContain('contentDescription = "Archived consent"; stateDescription = "Required, Disabled, Unchecked"');
        expect(compose).toContain('contentDescription = "Live code"; stateDescription = "Required, Invalid"');
        expect(compose).not.toContain('contentDescription = "Archived code"; stateDescription = "Required, Invalid"');
        expect(compose).not.toContain('contentDescription = "Archived status"; stateDescription = "Required, Invalid"');

        expect(swiftui).toContain('.accessibilityLabel("Archived code")');
        expect(swiftui).toContain('.accessibilityLabel("Archived status")');
        expect(swiftui).toContain('.accessibilityLabel("Archived consent")');
        expect((swiftui.match(/\.accessibilityValue\("Required, Disabled"\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(swiftui).toContain('.accessibilityValue("Required, Disabled, Unchecked")');
        expect(swiftui).toContain('.accessibilityValue("Required, Invalid")');
    });

    it('maps validation pseudo-class selectors into native output automatically', () => {
        styles.addClass('validation-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.validation-stack', 'select:invalid', {
            color: '#ff3300',
            textTransform: 'uppercase',
        });
        styles.child('.validation-stack', 'select:valid', {
            textTransform: 'uppercase',
        });
        styles.child('.validation-stack', 'select:optional', {
            textDecoration: 'underline',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'validation-stack' },
                select(
                    { required: true },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
                select(
                    option({ value: 'ready', selected: true }, 'Ready'),
                    option({ value: 'hold' }, 'Hold'),
                ),
            ),
            { functionName: 'ValidationPseudoScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'validation-stack' },
                select(
                    { required: true },
                    option({ value: 'draft' }, 'Draft'),
                    option({ value: 'published' }, 'Published'),
                ),
                select(
                    option({ value: 'ready', selected: true }, 'Ready'),
                    option({ value: 'hold' }, 'Hold'),
                ),
            ),
            { structName: 'ValidationPseudoScreen' },
        );

        expect(compose).toContain('Text(text = "Select".uppercase(), color = Color(red = 1f, green = 0.2f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Ready".uppercase(), textDecoration = TextDecoration.Underline)');

        expect(swiftui).toContain('Text("Select")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.2, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("Ready")');
        expect(swiftui).toContain('.underline()');
    });

    it('maps text input edit-state pseudo-class selectors into native output automatically', () => {
        styles.addClass('edit-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.edit-stack', 'input:placeholder-shown', {
            textDecoration: 'underline',
        });
        styles.child('.edit-stack', 'input:read-only', {
            background: '#f5f1ea',
        });
        styles.child('.edit-stack', 'textarea:read-write', {
            border: '2px solid #d56e43',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'edit-stack' },
                input({ value: '', placeholder: 'Search' }),
                input({ value: 'Locked', readOnly: true }),
                textarea({ value: 'Draft' }),
            ),
            { functionName: 'EditPseudoScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'edit-stack' },
                input({ value: '', placeholder: 'Search' }),
                input({ value: 'Locked', readOnly: true }),
                textarea({ value: 'Draft' }),
            ),
            { structName: 'EditPseudoScreen' },
        );

        expect(compose).toContain('textStyle = androidx.compose.ui.text.TextStyle(textDecoration = TextDecoration.Underline)');
        expect(compose).toContain('Modifier.background(Color(red = 0.961f, green = 0.945f, blue = 0.918f, alpha = 1f))');
        expect(compose).toContain('Modifier.border(2.dp, Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f))');

        expect(swiftui).toContain('TextField("Search", text: $textFieldValue0)');
        expect(swiftui).toContain('.underline()');
        expect(swiftui).toContain('.background(Color(red: 0.961, green: 0.945, blue: 0.918, opacity: 1))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1), lineWidth: 2))');
    });

    it('maps focus-within and empty pseudo-class selectors into native output automatically', () => {
        styles.addClass('runtime-state-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.runtime-state-stack', '.focus-shell:focus-within', {
            border: '2px solid #d56e43',
        });
        styles.child('.runtime-state-stack', '.empty-shell:empty', {
            background: '#f5f1ea',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'runtime-state-stack' },
                div({ className: 'focus-shell' }, input({ value: 'Locked', autoFocus: true })),
                div({ className: 'empty-shell' }),
                div({ className: 'empty-shell' }, span('Filled')),
            ),
            { functionName: 'RuntimePseudoScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'runtime-state-stack' },
                div({ className: 'focus-shell' }, input({ value: 'Locked', autoFocus: true })),
                div({ className: 'empty-shell' }),
                div({ className: 'empty-shell' }, span('Filled')),
            ),
            { structName: 'RuntimePseudoScreen' },
        );

        expect((compose.match(/border\(2\.dp, Color\(red = 0\.835f, green = 0\.431f, blue = 0\.263f, alpha = 1f\)\)/g) ?? []).length).toBe(1);
        expect((compose.match(/background\(Color\(red = 0\.961f, green = 0\.945f, blue = 0\.918f, alpha = 1f\)\)/g) ?? []).length).toBe(1);

        expect((swiftui.match(/stroke\(Color\(red: 0\.835, green: 0\.431, blue: 0\.263, opacity: 1\), lineWidth: 2\)/g) ?? []).length).toBe(1);
        expect((swiftui.match(/\.background\(Color\(red: 0\.961, green: 0\.945, blue: 0\.918, opacity: 1\)\)/g) ?? []).length).toBe(1);
    });

    it('maps explicit focus and focus-visible selectors onto practical focusable native elements', () => {
        styles.addClass('focusable-state-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.focusable-state-stack', 'button:focus', {
            border: '2px solid #d56e43',
        });
        styles.child('.focusable-state-stack', 'a:focus-visible', {
            textDecoration: 'underline',
        });
        styles.child('.focusable-state-stack', 'div:focus', {
            background: '#f5f1ea',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'focusable-state-stack' },
                button({ focused: true }, 'Save draft'),
                a({ href: 'https://elit.dev/docs', focused: true }, 'Docs link'),
                div({ tabIndex: 0, focused: true }, 'Focusable panel'),
            ),
            { functionName: 'FocusablePseudoScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'focusable-state-stack' },
                button({ focused: true }, 'Save draft'),
                a({ href: 'https://elit.dev/docs', focused: true }, 'Docs link'),
                div({ tabIndex: 0, focused: true }, 'Focusable panel'),
            ),
            { structName: 'FocusablePseudoScreen' },
        );

        expect(compose).toContain('border(2.dp, Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Docs link", textDecoration = TextDecoration.Underline)');
        expect(compose).toContain('background(Color(red = 0.961f, green = 0.945f, blue = 0.918f, alpha = 1f))');

        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1), lineWidth: 2))');
        expect(swiftui).toContain('.underline()');
        expect(swiftui).toContain('.background(Color(red: 0.961, green: 0.945, blue: 0.918, opacity: 1))');
    });

    it('maps enabled and explicit active selectors onto practical native state signals', () => {
        styles.addClass('interactive-state-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.interactive-state-stack', 'button:enabled', {
            border: '2px solid #d56e43',
        });
        styles.child('.interactive-state-stack', '.toggle-chip:active', {
            background: '#f5f1ea',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'interactive-state-stack' },
                button('Save draft'),
                button({ disabled: true }, 'Disabled action'),
                div({ className: 'toggle-chip', role: 'button', 'aria-label': 'Mute preview', 'aria-pressed': true }, 'Muted'),
            ),
            { functionName: 'InteractivePseudoScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'interactive-state-stack' },
                button('Save draft'),
                button({ disabled: true }, 'Disabled action'),
                div({ className: 'toggle-chip', role: 'button', 'aria-label': 'Mute preview', 'aria-pressed': true }, 'Muted'),
            ),
            { structName: 'InteractivePseudoScreen' },
        );

        expect((compose.match(/border\(2\.dp, Color\(red = 0\.835f, green = 0\.431f, blue = 0\.263f, alpha = 1f\)\)/g) ?? []).length).toBe(1);
        expect(compose).toContain('background(Color(red = 0.961f, green = 0.945f, blue = 0.918f, alpha = 1f))');
        expect(compose).toContain('stateDescription = "Pressed"');

        expect((swiftui.match(/stroke\(Color\(red: 0\.835, green: 0\.431, blue: 0\.263, opacity: 1\), lineWidth: 2\)/g) ?? []).length).toBe(1);
        expect(swiftui).toContain('.background(Color(red: 0.961, green: 0.945, blue: 0.918, opacity: 1))');
        expect(swiftui).toContain('.accessibilityValue("Pressed")');
    });

    it('maps runtime active button and link styles onto native press-state output', () => {
        styles.addClass('runtime-active-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.runtime-active-stack', 'button:active', {
            background: '#f5f1ea',
        });
        styles.child('.runtime-active-stack', 'a:active', {
            textDecoration: 'underline',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'runtime-active-stack' },
                button('Save draft'),
                a({ href: 'https://elit.dev/docs' }, 'Docs'),
            ),
            { functionName: 'RuntimeActiveScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'runtime-active-stack' },
                button('Save draft'),
                a({ href: 'https://elit.dev/docs' }, 'Docs'),
            ),
            { structName: 'RuntimeActiveScreen' },
        );

        expect((compose.match(/MutableInteractionSource\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((compose.match(/collectIsPressedAsState\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(compose).toContain('background(Color(red = 0.961f, green = 0.945f, blue = 0.918f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Docs", textDecoration = TextDecoration.Underline)');

        expect(swiftui).toContain('@GestureState private var interactionPressed0 = false');
        expect(swiftui).toContain('@GestureState private var interactionPressed1 = false');
        expect(swiftui).toContain('.simultaneousGesture(DragGesture(minimumDistance: 0).updating($interactionPressed0) { _, state, _ in');
        expect(swiftui).toContain('.simultaneousGesture(DragGesture(minimumDistance: 0).updating($interactionPressed1) { _, state, _ in');
        expect(swiftui).toContain('.background(Color(red: 0.961, green: 0.945, blue: 0.918, opacity: 1))');
        expect(swiftui).toContain('.underline()');
    });

    it('materializes desktop runtime pseudo-style variants for generic output', () => {
        styles.addClass('desktop-runtime-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        });
        styles.child('.desktop-runtime-stack', 'button:hover', {
            backgroundColor: '#f5f1ea',
        });
        styles.child('.desktop-runtime-stack', 'button:active', {
            backgroundColor: '#eadfd2',
            borderColor: '#d56e43',
        });
        styles.child('.desktop-runtime-stack', 'a:focus-visible', {
            color: '#d56e43',
            textDecoration: 'underline',
        });

        const tree = renderMaterializedNativeTree(
            div(
                { className: 'desktop-runtime-stack' },
                button('Save draft'),
                a({ href: 'https://elit.dev/docs' }, 'Docs'),
            ),
            { platform: 'generic' },
        );

        const [root] = tree.roots;
        expect(root.kind).toBe('element');
        if (root.kind !== 'element') {
            throw new Error('Expected root element node');
        }

        const buttonNode = root.children[0];
        const linkNode = root.children[1];

        expect(buttonNode).toMatchObject({
            kind: 'element',
            component: 'Button',
            props: {
                desktopStyleVariants: {
                    hover: {
                        backgroundColor: '#f5f1ea',
                    },
                    active: {
                        backgroundColor: '#eadfd2',
                        borderColor: '#d56e43',
                    },
                },
            },
        });

        expect(linkNode).toMatchObject({
            kind: 'element',
            component: 'Link',
            props: {
                desktopStyleVariants: {
                    focus: {
                        color: '#d56e43',
                        textDecoration: 'underline',
                    },
                },
            },
        });
    });

    it('maps practical role and aria accessibility semantics into native output', () => {
        const compose = renderAndroidCompose(
            div(
                div({ role: 'button', 'aria-label': 'Open settings', 'aria-description': 'Opens preferences', 'aria-selected': true }, 'Settings'),
                div({ role: 'checkbox', 'aria-label': 'Beta access', 'aria-checked': false, 'aria-disabled': true }),
                h2({ role: 'heading', 'aria-label': 'Account heading' }, 'Account'),
            ),
            { functionName: 'AriaRoleScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ role: 'button', 'aria-label': 'Open settings', 'aria-description': 'Opens preferences', 'aria-selected': true }, 'Settings'),
                div({ role: 'checkbox', 'aria-label': 'Beta access', 'aria-checked': false, 'aria-disabled': true }),
                h2({ role: 'heading', 'aria-label': 'Account heading' }, 'Account'),
            ),
            { structName: 'AriaRoleScreen' },
        );

        expect(compose).toContain('role = Role.Button');
        expect(compose).toContain('contentDescription = "Open settings"');
        expect(compose).toContain('selected = true');
        expect(compose).toContain('stateDescription = "Opens preferences, Selected"');
        expect(compose).toContain('role = Role.Checkbox');
        expect(compose).toContain('stateDescription = "Disabled, Unchecked"');
        expect(compose).toContain('disabled()');
        expect(compose).toContain('heading()');

        expect(swiftui).toContain('.accessibilityLabel("Open settings")');
        expect(swiftui).toContain('.accessibilityHint("Opens preferences")');
        expect(swiftui).toContain('.accessibilityValue("Selected")');
        expect(swiftui).toContain('.accessibilityAddTraits(.isButton)');
        expect(swiftui).toContain('.accessibilityAddTraits(.isSelected)');
        expect(swiftui).toContain('.accessibilityLabel("Beta access")');
        expect(swiftui).toContain('.accessibilityValue("Disabled, Unchecked")');
        expect(swiftui).toContain('.accessibilityAddTraits(.isHeader)');
    });

    it('renders Compose bridge helpers for universal action metadata', () => {
        const compose = renderAndroidCompose(
            div(
                button(
                    createUniversalBridgeProps({
                        action: 'validation.record',
                        route: '/native/coverage',
                        payload: { surface: 'android' },
                    }),
                    'Dispatch validation',
                ),
                a(
                    mergeUniversalProps(
                        createUniversalLinkProps('/native/checklist', {
                            payload: { source: 'compose-link' },
                        }),
                        { className: 'cta-link' },
                    ),
                    'Open checklist',
                ),
            ),
            { functionName: 'BridgeScreen' },
        );

        expect(compose).toContain('object ElitNativeBridge {');
        expect(compose).toContain('var onAction: ((String, String?, String?) -> Unit)? = null');
        expect(compose).toContain('var onNavigate: ((String) -> Unit)? = null');
        expect(compose).toContain('ElitNativeBridge.dispatch(action = "validation.record", route = "/native/coverage", payloadJson = "{\\"surface\\":\\"android\\"}")');
        expect(compose).toContain('ElitNativeBridge.dispatch(route = "/native/checklist", payloadJson = "{\\"source\\":\\"compose-link\\"}")');
    });

    it('renders SwiftUI bridge helpers for universal action metadata', () => {
        const swiftui = renderSwiftUI(
            div(
                button(
                    createUniversalBridgeProps({
                        action: 'validation.record',
                        route: '/native/coverage',
                        payload: { surface: 'ios' },
                    }),
                    'Dispatch validation',
                ),
                a(
                    createUniversalLinkProps('/native/checklist', {
                        payload: { source: 'swift-link' },
                    }),
                    'Open checklist',
                ),
            ),
            { structName: 'BridgeScreen' },
        );

        expect(swiftui).toContain('enum ElitNativeBridge {');
        expect(swiftui).toContain('static var onAction: ((String, String?, String?) -> Void)?');
        expect(swiftui).toContain('static var onNavigate: ((String) -> Void)?');
        expect(swiftui).toContain('ElitNativeBridge.dispatch(action: "validation.record", route: "/native/coverage", payloadJson: "{\\"surface\\":\\"ios\\"}")');
        expect(swiftui).toContain('ElitNativeBridge.dispatch(route: "/native/checklist", payloadJson: "{\\"source\\":\\"swift-link\\"}")');
    });

    it('maps richer shared style props into Compose output', () => {
        const compose = renderAndroidCompose(
            div(
                {
                    style: {
                        background: 'rgba(255, 249, 241, 0.92)',
                        border: '1px solid rgba(38, 25, 20, 0.12)',
                        borderRadius: '24px',
                        maxWidth: '320px',
                        padding: '24px',
                        gap: '12px',
                    },
                },
                div(
                    { style: { flexDirection: 'row', alignItems: 'center', gap: '20px' } },
                    span({ style: { color: '#d56e43', fontSize: '12px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase' } }, 'mobile'),
                    span({ style: { color: '#261914' } }, 'Styled card'),
                ),
            ),
            { functionName: 'StyledScreen' },
        );

        expect(compose).toContain('widthIn(max = 320.dp)');
        expect(compose).toContain('background(color = Color(');
        expect(compose).toContain('RoundedCornerShape(24.dp)');
        expect(compose).toContain('border(1.dp, Color(');
        expect(compose).toContain('verticalArrangement = Arrangement.spacedBy(12.dp)');
        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('Text(text = "MOBILE", color = Color(');
        expect(compose).toContain('fontSize = 12.sp');
        expect(compose).toContain('fontWeight = FontWeight.W700');
        expect(compose).toContain('letterSpacing = 1.2.sp');
    });

    it('maps richer shared style props into SwiftUI output', () => {
        const swiftui = renderSwiftUI(
            div(
                {
                    style: {
                        background: 'rgba(255, 249, 241, 0.92)',
                        border: '1px solid rgba(38, 25, 20, 0.12)',
                        borderRadius: '24px',
                        maxWidth: '320px',
                        padding: '24px',
                        gap: '12px',
                    },
                },
                div(
                    { style: { flexDirection: 'row', alignItems: 'center', gap: '20px' } },
                    span({ style: { color: '#d56e43', fontSize: '12px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase' } }, 'mobile'),
                    span({ style: { color: '#261914' } }, 'Styled card'),
                ),
            ),
            { structName: 'StyledScreen' },
        );

        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 12) {');
        expect(swiftui).toContain('HStack(alignment: .center, spacing: 20) {');
        expect(swiftui).toContain('Text("MOBILE")');
        expect(swiftui).toContain('.font(.system(size: 12, weight: .bold))');
        expect(swiftui).toContain('.kerning(1.2)');
        expect(swiftui).toContain('.background(Color(');
        expect(swiftui).toContain('.clipShape(RoundedRectangle(cornerRadius: 24))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(');
        expect(swiftui).toContain('.frame(maxWidth: 320)');
    });

    it('parses hsl alpha and named CSS colors into native output', () => {
        const compose = renderAndroidCompose(
            div(
                {
                    style: {
                        backgroundColor: 'hsla(120, 100%, 25%, 0.5)',
                        border: '1px solid transparent',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'rebeccapurple' } }, 'Tone'),
            ),
            { functionName: 'CssColorParsingScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                {
                    style: {
                        backgroundColor: 'hsla(120, 100%, 25%, 0.5)',
                        border: '1px solid transparent',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'rebeccapurple' } }, 'Tone'),
            ),
            { structName: 'CssColorParsingScreen' },
        );

        expect(compose).toContain('background(Color(red = 0f, green = 0.502f, blue = 0f, alpha = 0.5f))');
        expect(compose).toContain('border(1.dp, Color(red = 0f, green = 0f, blue = 0f, alpha = 0f))');
        expect(compose).toContain('Text(text = "Tone", color = Color(red = 0.4f, green = 0.2f, blue = 0.6f, alpha = 1f))');

        expect(swiftui).toContain('.background(Color(red: 0, green: 0.502, blue: 0, opacity: 0.5))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0, green: 0, blue: 0, opacity: 0), lineWidth: 1))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.4, green: 0.2, blue: 0.6, opacity: 1))');
    });

    it('parses hwb and modern rgb css color syntax into native output', () => {
        const compose = renderAndroidCompose(
            div(
                {
                    style: {
                        backgroundColor: 'hwb(0 20% 10% / 60%)',
                        border: '1px solid rgb(255 200 100 / 50%)',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'rgb(10% 20% 30% / 40%)' } }, 'Tone'),
            ),
            { functionName: 'CssColorLevel4Screen' },
        );

        const swiftui = renderSwiftUI(
            div(
                {
                    style: {
                        backgroundColor: 'hwb(0 20% 10% / 60%)',
                        border: '1px solid rgb(255 200 100 / 50%)',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'rgb(10% 20% 30% / 40%)' } }, 'Tone'),
            ),
            { structName: 'CssColorLevel4Screen' },
        );

        expect(compose).toContain('background(Color(red = 0.902f, green = 0.2f, blue = 0.2f, alpha = 0.6f))');
        expect(compose).toContain('border(1.dp, Color(red = 1f, green = 0.784f, blue = 0.392f, alpha = 0.5f))');
        expect(compose).toContain('Text(text = "Tone", color = Color(red = 0.102f, green = 0.2f, blue = 0.302f, alpha = 0.4f))');

        expect(swiftui).toContain('.background(Color(red: 0.902, green: 0.2, blue: 0.2, opacity: 0.6))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 1, green: 0.784, blue: 0.392, opacity: 0.5), lineWidth: 1))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.102, green: 0.2, blue: 0.302, opacity: 0.4))');
    });

    it('parses extended named css colors into native output', () => {
        const compose = renderAndroidCompose(
            div(
                {
                    style: {
                        backgroundColor: 'aliceblue',
                        border: '1px solid goldenrod',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'slateblue' } }, 'Tone'),
                span({ style: { color: 'darkslategrey' } }, 'Alias'),
            ),
            { functionName: 'ExtendedNamedColorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                {
                    style: {
                        backgroundColor: 'aliceblue',
                        border: '1px solid goldenrod',
                        padding: '16px',
                    },
                },
                span({ style: { color: 'slateblue' } }, 'Tone'),
                span({ style: { color: 'darkslategrey' } }, 'Alias'),
            ),
            { structName: 'ExtendedNamedColorScreen' },
        );

        expect(compose).toContain('background(Color(red = 0.941f, green = 0.973f, blue = 1f, alpha = 1f))');
        expect(compose).toContain('border(1.dp, Color(red = 0.855f, green = 0.647f, blue = 0.125f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Tone", color = Color(red = 0.416f, green = 0.353f, blue = 0.804f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Alias", color = Color(red = 0.184f, green = 0.31f, blue = 0.31f, alpha = 1f))');

        expect(swiftui).toContain('.background(Color(red: 0.941, green: 0.973, blue: 1, opacity: 1))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.855, green: 0.647, blue: 0.125, opacity: 1), lineWidth: 1))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.416, green: 0.353, blue: 0.804, opacity: 1))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.184, green: 0.31, blue: 0.31, opacity: 1))');
    });

    it('resolves currentColor through inherited text color across native surfaces', () => {
        const compose = renderAndroidCompose(
            div(
                { style: { color: 'slateblue', gap: '12px' } },
                div(
                    {
                        style: {
                            backgroundColor: 'currentColor',
                            border: '2px solid currentColor',
                            boxShadow: '0 8px 18px currentColor',
                            padding: '16px',
                        },
                    },
                    span({ style: { color: 'currentColor' } }, 'Tone'),
                ),
                div(
                    {
                        style: {
                            color: '#261914',
                            background: 'linear-gradient(currentColor, transparent)',
                            padding: '12px',
                        },
                    },
                    span('Gradient'),
                ),
            ),
            { functionName: 'CurrentColorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { style: { color: 'slateblue', gap: '12px' } },
                div(
                    {
                        style: {
                            backgroundColor: 'currentColor',
                            border: '2px solid currentColor',
                            boxShadow: '0 8px 18px currentColor',
                            padding: '16px',
                        },
                    },
                    span({ style: { color: 'currentColor' } }, 'Tone'),
                ),
                div(
                    {
                        style: {
                            color: '#261914',
                            background: 'linear-gradient(currentColor, transparent)',
                            padding: '12px',
                        },
                    },
                    span('Gradient'),
                ),
            ),
            { structName: 'CurrentColorScreen' },
        );

        expect(compose).toContain('background(Color(red = 0.416f, green = 0.353f, blue = 0.804f, alpha = 1f))');
        expect(compose).toContain('border(2.dp, Color(red = 0.416f, green = 0.353f, blue = 0.804f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Tone", color = Color(red = 0.416f, green = 0.353f, blue = 0.804f, alpha = 1f))');
        expect(compose).toContain('background(brush = Brush.linearGradient(colors = listOf(Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 1f), Color(red = 0f, green = 0f, blue = 0f, alpha = 0f))))');

        expect(swiftui).toContain('.background(Color(red: 0.416, green: 0.353, blue: 0.804, opacity: 1))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.416, green: 0.353, blue: 0.804, opacity: 1), lineWidth: 2))');
        expect(swiftui).toContain('.shadow(color: Color(red: 0.416, green: 0.353, blue: 0.804, opacity: 1), radius: 9, x: 0, y: 8)');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.416, green: 0.353, blue: 0.804, opacity: 1))');
        expect(swiftui).toContain('.background(LinearGradient(colors: [Color(red: 0.149, green: 0.098, blue: 0.078, opacity: 1), Color(red: 0, green: 0, blue: 0, opacity: 0)], startPoint: .topLeading, endPoint: .bottomTrailing))');
    });

    it('parses practical CSS Color 4 functions into native surfaces', () => {
        const compose = renderAndroidCompose(
            div(
                div({ style: { backgroundColor: 'lab(55% 40 30 / 75%)', padding: '12px' } }, span('Lab surface')),
                div({ style: { border: '2px solid lch(72% 60 38)', padding: '12px' } }, span('Lch border')),
                span({ style: { color: 'oklab(62% 0.12 0.08)' } }, 'Oklab tone'),
                span({ style: { color: 'oklch(74% 0.18 32)' } }, 'Oklch tone'),
            ),
            { functionName: 'ColorFourScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ style: { backgroundColor: 'lab(55% 40 30 / 75%)', padding: '12px' } }, span('Lab surface')),
                div({ style: { border: '2px solid lch(72% 60 38)', padding: '12px' } }, span('Lch border')),
                span({ style: { color: 'oklab(62% 0.12 0.08)' } }, 'Oklab tone'),
                span({ style: { color: 'oklch(74% 0.18 32)' } }, 'Oklch tone'),
            ),
            { structName: 'ColorFourScreen' },
        );

        expect(compose).toContain('background(Color(red = 0.792f, green = 0.396f, blue = 0.322f, alpha = 0.75f))');
        expect(compose).toContain('border(2.dp, Color(red = 1f, green = 0.541f, blue = 0.439f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Oklab tone", color = Color(red = 0.808f, green = 0.38f, blue = 0.286f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Oklch tone", color = Color(red = 1f, green = 0.471f, blue = 0.369f, alpha = 1f))');

        expect(swiftui).toContain('.background(Color(red: 0.792, green: 0.396, blue: 0.322, opacity: 0.75))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 1, green: 0.541, blue: 0.439, opacity: 1), lineWidth: 2))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.808, green: 0.38, blue: 0.286, opacity: 1))');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.471, blue: 0.369, opacity: 1))');
    });

    it('maps uniform border longhands into native output', () => {
        styles.addClass('longhand-card', {
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#d56e43',
            borderRadius: '12px',
            padding: '16px',
        });
        styles.addClass('uniform-side-card', {
            borderTopWidth: '1px',
            borderRightWidth: '1px',
            borderBottomWidth: '1px',
            borderLeftWidth: '1px',
            borderTopStyle: 'solid',
            borderRightStyle: 'solid',
            borderBottomStyle: 'solid',
            borderLeftStyle: 'solid',
            borderTopColor: '#261914',
            borderRightColor: '#261914',
            borderBottomColor: '#261914',
            borderLeftColor: '#261914',
            padding: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                div({ className: 'longhand-card' }, span('Longhand border')),
                div({ className: 'uniform-side-card' }, span('Uniform side border')),
            ),
            { functionName: 'BorderLonghandScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ className: 'longhand-card' }, span('Longhand border')),
                div({ className: 'uniform-side-card' }, span('Uniform side border')),
            ),
            { structName: 'BorderLonghandScreen' },
        );

        expect(compose).toContain('border(2.dp, Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f), RoundedCornerShape(12.dp))');
        expect(compose).toContain('border(1.dp, Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 1f))');

        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1), lineWidth: 2))');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.149, green: 0.098, blue: 0.078, opacity: 1), lineWidth: 1))');
    });

    it('maps non-uniform per-side borders into native output', () => {
        styles.addClass('side-border-card', {
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderTopColor: '#d56e43',
            borderRightWidth: '2px',
            borderRightStyle: 'solid',
            borderRightColor: 'rgb(12 44 88 / 80%)',
            borderBottomWidth: '3px',
            borderBottomStyle: 'solid',
            borderBottomColor: 'hwb(120 10% 20%)',
            borderLeftWidth: '4px',
            borderLeftStyle: 'solid',
            borderLeftColor: '#261914',
            padding: '16px',
        });

        const compose = renderAndroidCompose(
            div({ className: 'side-border-card' }, span('Side borders')),
            { functionName: 'SideBorderScreen' },
        );

        const swiftui = renderSwiftUI(
            div({ className: 'side-border-card' }, span('Side borders')),
            { structName: 'SideBorderScreen' },
        );

        expect(compose).toContain('drawBehind {');
        expect(compose).toContain('val topStroke = 1.dp.toPx()');
    expect(compose).toContain('drawLine(color = Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f), start = androidx.compose.ui.geometry.Offset(4.dp.toPx() / 2f, topStroke / 2f)');
    expect(compose).toContain('cap = androidx.compose.ui.graphics.StrokeCap.Square');
        expect(compose).toContain('val rightStroke = 2.dp.toPx()');
    expect(compose).toContain('drawLine(color = Color(red = 0.047f, green = 0.173f, blue = 0.345f, alpha = 0.8f), start = androidx.compose.ui.geometry.Offset(size.width - (rightStroke / 2f), 1.dp.toPx() / 2f)');
        expect(compose).toContain('val bottomStroke = 3.dp.toPx()');
    expect(compose).toContain('drawLine(color = Color(red = 0.102f, green = 0.8f, blue = 0.102f, alpha = 1f), start = androidx.compose.ui.geometry.Offset(4.dp.toPx() / 2f, size.height - (bottomStroke / 2f))');
        expect(compose).toContain('val leftStroke = 4.dp.toPx()');
    expect(compose).toContain('drawLine(color = Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 1f), start = androidx.compose.ui.geometry.Offset(leftStroke / 2f, 1.dp.toPx() / 2f)');

        expect(swiftui).toContain('.overlay { ZStack {');
        expect(swiftui).toContain('Rectangle().fill(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1)).frame(height: 1).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)');
        expect(swiftui).toContain('Rectangle().fill(Color(red: 0.047, green: 0.173, blue: 0.345, opacity: 0.8)).frame(width: 2).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)');
        expect(swiftui).toContain('Rectangle().fill(Color(red: 0.102, green: 0.8, blue: 0.102, opacity: 1)).frame(height: 3).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)');
        expect(swiftui).toContain('Rectangle().fill(Color(red: 0.149, green: 0.098, blue: 0.078, opacity: 1)).frame(width: 4).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)');
    });

    it('maps dashed and dotted borders into native output', () => {
        styles.addClass('dashed-card', {
            border: '2px dashed #d56e43',
            borderRadius: '12px',
            padding: '16px',
        });
        styles.addClass('dotted-card', {
            borderWidth: '3px',
            borderStyle: 'dotted',
            borderColor: 'rgb(12 44 88 / 80%)',
            padding: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                div({ className: 'dashed-card' }, span('Dashed border')),
                div({ className: 'dotted-card' }, span('Dotted border')),
            ),
            { functionName: 'StyledBorderScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ className: 'dashed-card' }, span('Dashed border')),
                div({ className: 'dotted-card' }, span('Dotted border')),
            ),
            { structName: 'StyledBorderScreen' },
        );

        expect(compose).toContain('val strokeWidth = 2.dp.toPx()');
        expect(compose).toContain('val dashPattern = floatArrayOf(strokeWidth * 3f, strokeWidth * 2f)');
        expect(compose).toContain('drawRoundRect(color = Color(red = 0.835f, green = 0.431f, blue = 0.263f, alpha = 1f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(borderRadius, borderRadius), style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokeWidth, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(dashPattern)))');
        expect(compose).toContain('val strokeWidth = 3.dp.toPx()');
        expect(compose).toContain('val dashPattern = floatArrayOf(strokeWidth, strokeWidth * 1.5f)');
        expect(compose).toContain('drawRect(color = Color(red = 0.047f, green = 0.173f, blue = 0.345f, alpha = 0.8f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokeWidth, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(dashPattern)))');

        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1), style: StrokeStyle(lineWidth: 2, dash: [6, 4])))');
        expect(swiftui).toContain('.overlay(Rectangle().stroke(Color(red: 0.047, green: 0.173, blue: 0.345, opacity: 0.8), style: StrokeStyle(lineWidth: 3, dash: [3, 4.5])))');
    });

    it('maps non-uniform dashed and dotted side borders into native output', () => {
        styles.addClass('styled-side-border-card', {
            borderTopWidth: '1px',
            borderTopStyle: 'dashed',
            borderTopColor: '#d56e43',
            borderRightWidth: '2px',
            borderRightStyle: 'dotted',
            borderRightColor: 'rgb(12 44 88 / 80%)',
            borderBottomWidth: '3px',
            borderBottomStyle: 'solid',
            borderBottomColor: 'hwb(120 10% 20%)',
            borderLeftWidth: '4px',
            borderLeftStyle: 'dashed',
            borderLeftColor: 'goldenrod',
            padding: '16px',
        });

        const compose = renderAndroidCompose(
            div({ className: 'styled-side-border-card' }, span('Styled side borders')),
            { functionName: 'StyledSideBorderScreen' },
        );

        const swiftui = renderSwiftUI(
            div({ className: 'styled-side-border-card' }, span('Styled side borders')),
            { structName: 'StyledSideBorderScreen' },
        );

        expect(compose).toContain('val topStroke = 1.dp.toPx()');
        expect(compose).toContain('pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(topStroke * 3f, topStroke * 2f))');
        expect(compose).toContain('start = androidx.compose.ui.geometry.Offset(4.dp.toPx() / 2f, topStroke / 2f)');
        expect(compose).toContain('val rightStroke = 2.dp.toPx()');
        expect(compose).toContain('pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(rightStroke, rightStroke * 1.5f))');
        expect(compose).toContain('cap = androidx.compose.ui.graphics.StrokeCap.Round');
        expect(compose).toContain('val bottomStroke = 3.dp.toPx()');
        expect(compose).toContain('drawLine(color = Color(red = 0.102f, green = 0.8f, blue = 0.102f, alpha = 1f), start = androidx.compose.ui.geometry.Offset(4.dp.toPx() / 2f, size.height - (bottomStroke / 2f)), end = androidx.compose.ui.geometry.Offset(size.width - (2.dp.toPx() / 2f), size.height - (bottomStroke / 2f)), strokeWidth = bottomStroke, cap = androidx.compose.ui.graphics.StrokeCap.Square)');
        expect(compose).toContain('val leftStroke = 4.dp.toPx()');
        expect(compose).toContain('pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(leftStroke * 3f, leftStroke * 2f))');

        expect(swiftui).toContain('.overlay { GeometryReader { proxy in ZStack {');
        expect(swiftui).toContain('Path { path in path.move(to: CGPoint(x: CGFloat(4) / 2, y: CGFloat(1) / 2)); path.addLine(to: CGPoint(x: proxy.size.width - (CGFloat(2) / 2), y: CGFloat(1) / 2)) }.stroke(Color(red: 0.835, green: 0.431, blue: 0.263, opacity: 1), style: StrokeStyle(lineWidth: 1, lineCap: .square, dash: [3, 2]))');
        expect(swiftui).toContain('Path { path in path.move(to: CGPoint(x: proxy.size.width - (CGFloat(2) / 2), y: CGFloat(1) / 2)); path.addLine(to: CGPoint(x: proxy.size.width - (CGFloat(2) / 2), y: proxy.size.height - (CGFloat(3) / 2))) }.stroke(Color(red: 0.047, green: 0.173, blue: 0.345, opacity: 0.8), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [2, 3]))');
        expect(swiftui).toContain('Path { path in path.move(to: CGPoint(x: CGFloat(4) / 2, y: proxy.size.height - (CGFloat(3) / 2))); path.addLine(to: CGPoint(x: proxy.size.width - (CGFloat(2) / 2), y: proxy.size.height - (CGFloat(3) / 2))) }.stroke(Color(red: 0.102, green: 0.8, blue: 0.102, opacity: 1), style: StrokeStyle(lineWidth: 3, lineCap: .square))');
        expect(swiftui).toContain('Path { path in path.move(to: CGPoint(x: CGFloat(4) / 2, y: CGFloat(1) / 2)); path.addLine(to: CGPoint(x: CGFloat(4) / 2, y: proxy.size.height - (CGFloat(3) / 2))) }.stroke(Color(red: 0.855, green: 0.647, blue: 0.125, opacity: 1), style: StrokeStyle(lineWidth: 4, lineCap: .square, dash: [12, 8]))');
    });

    it('maps registered className CSS into native output automatically', () => {
        const line = styles.addVar('line', 'rgba(38, 25, 20, 0.12)');
        const ember = styles.addVar('ember', '#d56e43');
        const clay = styles.addVar('clay', '#b75a36');

        styles.addClass('panel', {
            background: 'rgba(255, 249, 241, 0.92)',
            border: `1px solid ${line.toString()}`,
            borderRadius: '24px',
            padding: '24px',
            gap: '14px',
        });
        styles.addClass('button-row', {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        });
        styles.addClass('btn', {
            padding: '12px 18px',
            borderRadius: '999px',
            fontWeight: 700,
        });
        styles.addClass('btn-primary', {
            background: `linear-gradient(135deg, ${styles.var(ember)} 0%, ${styles.var(clay)} 100%)`,
            color: '#fff6ee',
            boxShadow: '0 10px 28px rgba(102, 61, 35, 0.15)',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'panel' },
                div(
                    { className: 'button-row' },
                    button({ className: 'btn btn-primary' }, 'Launch now'),
                ),
            ),
            { functionName: 'ClassNameScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'panel' },
                div(
                    { className: 'button-row' },
                    button({ className: 'btn btn-primary' }, 'Launch now'),
                ),
            ),
            { structName: 'ClassNameScreen' },
        );

        expect(compose).toContain('background(color = Color(');
        expect(compose).toContain('border(1.dp, Color(');
        expect(compose).toContain('verticalArrangement = Arrangement.spacedBy(14.dp)');
        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('Box(modifier = Modifier.shadow(elevation = 10.dp, shape = RoundedCornerShape(999.dp)).background(brush = Brush.linearGradient(colors = listOf(');
        expect(compose).toContain('.padding(top = 12.dp, end = 18.dp, bottom = 12.dp, start = 18.dp), contentAlignment = Alignment.Center)');
        expect(compose).toContain('Text(text = "Launch now", color = Color(');

        expect(swiftui).toContain('.background(Color(');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(');
        expect(swiftui).toContain('HStack(alignment: .center, spacing: 12) {');
        expect(swiftui).toContain('.background(LinearGradient(colors: [Color(');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
    });

    it('maps multiple box shadows and skips inset-only fallback shadows in native output', () => {
        styles.addClass('stacked-shadow-card', {
            padding: '16px',
            borderRadius: '24px',
            background: '#fff',
            boxShadow: '0 4px 12px rgba(38, 25, 20, 0.12), 0 18px 44px rgba(102, 61, 35, 0.18)',
        });
        styles.addClass('inset-shadow-card', {
            padding: '16px',
            borderRadius: '24px',
            background: '#fff',
            boxShadow: 'inset 0 1px 2px rgba(38, 25, 20, 0.12), 0 10px 24px rgba(102, 61, 35, 0.15)',
        });

        const compose = renderAndroidCompose(
            div(
                div({ className: 'stacked-shadow-card' }, span('Layered shadow')),
                div({ className: 'inset-shadow-card' }, span('Inset fallback')),
            ),
            { functionName: 'MultiShadowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ className: 'stacked-shadow-card' }, span('Layered shadow')),
                div({ className: 'inset-shadow-card' }, span('Inset fallback')),
            ),
            { structName: 'MultiShadowScreen' },
        );

        expect((compose.match(/shadow\(elevation = /g) ?? []).length).toBe(3);
        expect((swiftui.match(/\.shadow\(color:/g) ?? []).length).toBe(3);
        expect(swiftui).toContain('.shadow(color: Color(red: 0.149, green: 0.098, blue: 0.078, opacity: 0.12), radius: 6, x: 0, y: 4)');
        expect(swiftui).toContain('.shadow(color: Color(red: 0.4, green: 0.239, blue: 0.137, opacity: 0.18), radius: 22, x: 0, y: 18)');
    });

    it('maps descendant selectors with class ancestry into native output automatically', () => {
        styles.addClass('panel', {
            gap: '16px',
        });
        styles.descendant('.panel', 'h2', {
            color: '#261914',
            fontSize: '23px',
            fontWeight: 700,
        });
        styles.addClass('field-label', {
            gap: '6px',
        });
        styles.descendant('.field-label', 'span', {
            color: '#261914',
            fontWeight: 700,
            textTransform: 'uppercase',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'panel' },
                h2('Panel title'),
                div(
                    { className: 'field-label' },
                    span('question label'),
                ),
            ),
            { functionName: 'DescendantScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'panel' },
                h2('Panel title'),
                div(
                    { className: 'field-label' },
                    span('question label'),
                ),
            ),
            { structName: 'DescendantScreen' },
        );

        expect(compose).toContain('verticalArrangement = Arrangement.spacedBy(16.dp)');
        expect(compose).toContain('Text(text = "Panel title", color = Color(');
        expect(compose).toContain('fontSize = 23.sp');
        expect(compose).toContain('fontWeight = FontWeight.W700');
        expect(compose).toContain('Text(text = "QUESTION LABEL", color = Color(');

        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 16) {');
        expect(swiftui).toContain('Text("Panel title")');
        expect(swiftui).toContain('.font(.system(size: 23, weight: .bold))');
        expect(swiftui).toContain('Text("QUESTION LABEL")');
    });

    it('maps child combinators, attribute selectors, and inherited text styles into native output automatically', () => {
        styles.addClass('theme', {
            color: '#261914',
            fontWeight: 700,
            textTransform: 'uppercase',
        });
        styles.addClass('toggle-row', {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        });
        styles.child('.toggle-row', 'input[type="checkbox"]', {
            width: '20px',
            minWidth: '20px',
            height: '20px',
        });
        styles.child('.toggle-row', 'span', {
            letterSpacing: '1.2px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'theme' },
                div(
                    { className: 'toggle-row' },
                    input({ type: 'checkbox', checked: true }),
                    span('native toggle'),
                ),
            ),
            { functionName: 'InheritedToggleScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'theme' },
                div(
                    { className: 'toggle-row' },
                    input({ type: 'checkbox', checked: true }),
                    span('native toggle'),
                ),
            ),
            { structName: 'InheritedToggleScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('modifier = Modifier.width(20.dp).height(20.dp).widthIn(min = 20.dp)');
        expect(compose).toContain('Text(text = "NATIVE TOGGLE", color = Color(');
        expect(compose).toContain('fontWeight = FontWeight.W700');
        expect(compose).toContain('letterSpacing = 1.2.sp');

        expect(swiftui).toContain('HStack(alignment: .center, spacing: 10) {');
        expect(swiftui).toContain('Toggle("", isOn: $toggleValue0)');
        expect(swiftui).toContain('.frame(width: 20, height: 20, minWidth: 20)');
        expect(swiftui).toContain('Text("NATIVE TOGGLE")');
        expect(swiftui).toContain('.foregroundStyle(Color(');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
    });

    it('maps sibling combinators and ancestor-sibling descendant selectors into native output automatically', () => {
        styles.addClass('form-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.addClass('title', {
            fontSize: '17px',
        });
        styles.adjacentSibling('.label', '.hint', {
            color: '#ff6600',
        });
        styles.generalSibling('.label', '.note', {
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
        });
        styles.descendant('.section + .section', '.title', {
            color: '#3366cc',
            fontWeight: 700,
        });
        styles.descendant('.section ~ .section', '.title', {
            textDecoration: 'underline',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'form-stack' },
                span({ className: 'label' }, 'Email'),
                span({ className: 'hint' }, 'Required'),
                span({ className: 'note' }, 'Native sibling'),
                div(
                    { className: 'section' },
                    span({ className: 'title' }, 'Primary'),
                ),
                div(
                    { className: 'section' },
                    span({ className: 'title' }, 'Secondary'),
                ),
            ),
            { functionName: 'SiblingCombinatorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'form-stack' },
                span({ className: 'label' }, 'Email'),
                span({ className: 'hint' }, 'Required'),
                span({ className: 'note' }, 'Native sibling'),
                div(
                    { className: 'section' },
                    span({ className: 'title' }, 'Primary'),
                ),
                div(
                    { className: 'section' },
                    span({ className: 'title' }, 'Secondary'),
                ),
            ),
            { structName: 'SiblingCombinatorScreen' },
        );

        expect(compose).toContain('Text(text = "Required", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "NATIVE SIBLING", letterSpacing = 1.4.sp)');
        expect(compose).toContain('Text(text = "Primary", fontSize = 17.sp)');
        expect(compose).toContain('Text(text = "Secondary", color = Color(red = 0.2f, green = 0.4f, blue = 0.8f, alpha = 1f), fontSize = 17.sp, fontWeight = FontWeight.W700, textDecoration = TextDecoration.Underline)');

        expect(swiftui).toContain('Text("Required")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("NATIVE SIBLING")');
        expect(swiftui).toContain('.kerning(1.4)');
        expect(swiftui).toContain('Text("Primary")');
        expect(swiftui).toContain('Text("Secondary")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 0.2, green: 0.4, blue: 0.8, opacity: 1))');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
        expect(swiftui).toContain('.underline()');
    });

    it('maps child-position pseudo-class selectors into native output automatically', () => {
        styles.addClass('pseudo-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.pseudo-stack', ':first-child', {
            color: '#ff6600',
        });
        styles.child('.pseudo-stack', ':nth-child(2)', {
            letterSpacing: '1.2px',
            textDecoration: 'underline',
        });
        styles.child('.pseudo-stack', ':nth-child(odd)', {
            textTransform: 'uppercase',
        });
        styles.child('.pseudo-stack', ':last-child', {
            fontWeight: 700,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'pseudo-stack' },
                span('Alpha'),
                span('Beta'),
                span('Gamma'),
            ),
            { functionName: 'ChildPseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'pseudo-stack' },
                span('Alpha'),
                span('Beta'),
                span('Gamma'),
            ),
            { structName: 'ChildPseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "ALPHA", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Beta", letterSpacing = 1.2.sp, textDecoration = TextDecoration.Underline)');
        expect(compose).toContain('Text(text = "GAMMA", fontWeight = FontWeight.W700)');

        expect(swiftui).toContain('Text("ALPHA")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("Beta")');
        expect(swiftui).toContain('.kerning(1.2)');
        expect(swiftui).toContain('.underline()');
        expect(swiftui).toContain('Text("GAMMA")');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
    });

    it('maps type-position and simple not pseudo-class selectors into native output automatically', () => {
        styles.addClass('type-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.type-stack', 'span:first-of-type', {
            color: '#ff6600',
        });
        styles.child('.type-stack', 'span:nth-of-type(2)', {
            letterSpacing: '1.1px',
            textDecoration: 'underline',
        });
        styles.child('.type-stack', 'span:last-of-type', {
            fontWeight: 700,
        });
        styles.child('.type-stack', 'span:not(.muted)', {
            textTransform: 'uppercase',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'type-stack' },
                span('Alpha'),
                h2('Heading'),
                span({ className: 'muted' }, 'Beta'),
                span('Gamma'),
            ),
            { functionName: 'TypePseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'type-stack' },
                span('Alpha'),
                h2('Heading'),
                span({ className: 'muted' }, 'Beta'),
                span('Gamma'),
            ),
            { structName: 'TypePseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "ALPHA", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Heading")');
        expect(compose).toContain('Text(text = "Beta", letterSpacing = 1.1.sp, textDecoration = TextDecoration.Underline)');
        expect(compose).toContain('Text(text = "GAMMA", fontWeight = FontWeight.W700)');

        expect(swiftui).toContain('Text("ALPHA")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("Heading")');
        expect(swiftui).toContain('Text("Beta")');
        expect(swiftui).toContain('.kerning(1.1)');
        expect(swiftui).toContain('.underline()');
        expect(swiftui).toContain('Text("GAMMA")');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
    });

    it('maps reverse-order and only-child pseudo-class selectors into native output automatically', () => {
        styles.addClass('reverse-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.reverse-stack', 'span:nth-last-child(2)', {
            textDecoration: 'underline',
        });
        styles.child('.reverse-stack', 'span:nth-last-of-type(2)', {
            letterSpacing: '1.3px',
        });
        styles.child('.reverse-stack', 'h2:only-of-type', {
            color: '#ff6600',
        });

        styles.addClass('singleton-stack', {
            display: 'flex',
            flexDirection: 'column',
        });
        styles.child('.singleton-stack', 'p:only-child', {
            textTransform: 'uppercase',
        });
        styles.child('.singleton-stack', 'p:only-of-type', {
            fontWeight: 700,
        });

        const compose = renderAndroidCompose(
            div(
                div(
                    { className: 'reverse-stack' },
                    span('Alpha'),
                    h2('Heading'),
                    span('Beta'),
                    p('Tail'),
                ),
                div(
                    { className: 'singleton-stack' },
                    p('Solo'),
                ),
            ),
            { functionName: 'ReversePseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div(
                    { className: 'reverse-stack' },
                    span('Alpha'),
                    h2('Heading'),
                    span('Beta'),
                    p('Tail'),
                ),
                div(
                    { className: 'singleton-stack' },
                    p('Solo'),
                ),
            ),
            { structName: 'ReversePseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "Alpha", letterSpacing = 1.3.sp)');
        expect(compose).toContain('Text(text = "Heading", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Beta", textDecoration = TextDecoration.Underline)');
        expect(compose).toContain('Text(text = "SOLO", fontWeight = FontWeight.W700)');

        expect(swiftui).toContain('Text("Alpha")');
        expect(swiftui).toContain('.kerning(1.3)');
        expect(swiftui).toContain('Text("Heading")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("Beta")');
        expect(swiftui).toContain('.underline()');
        expect(swiftui).toContain('Text("SOLO")');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
    });

    it('maps selector-list and nested not pseudo-class selectors into native output automatically', () => {
        styles.addClass('not-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.not-stack', 'span:not(.muted, :nth-child(2), [data-tone="soft"])', {
            textTransform: 'uppercase',
        });
        styles.child('.not-stack', 'span:not(:not(.accent))', {
            color: '#ff6600',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'not-stack' },
                span({ className: 'accent' }, 'Alpha'),
                span('Beta'),
                span({ className: 'muted' }, 'Gamma'),
                span({ 'data-tone': 'soft' }, 'Delta'),
            ),
            { functionName: 'NestedNotPseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'not-stack' },
                span({ className: 'accent' }, 'Alpha'),
                span('Beta'),
                span({ className: 'muted' }, 'Gamma'),
                span({ 'data-tone': 'soft' }, 'Delta'),
            ),
            { structName: 'NestedNotPseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "ALPHA", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "Beta")');
        expect(compose).toContain('Text(text = "Gamma")');
        expect(compose).toContain('Text(text = "Delta")');
        expect(compose).not.toContain('Text(text = "BETA"');
        expect(compose).not.toContain('Text(text = "GAMMA"');
        expect(compose).not.toContain('Text(text = "DELTA"');

        expect(swiftui).toContain('Text("ALPHA")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("Beta")');
        expect(swiftui).toContain('Text("Gamma")');
        expect(swiftui).toContain('Text("Delta")');
        expect(swiftui).not.toContain('Text("BETA")');
        expect(swiftui).not.toContain('Text("GAMMA")');
        expect(swiftui).not.toContain('Text("DELTA")');
    });

    it('maps practical has pseudo-class selectors into native output automatically', () => {
        styles.addClass('has-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.has-stack', '.card:has(.accent)', {
            letterSpacing: '1.2px',
        });
        styles.child('.has-stack', '.card:has(> h2)', {
            color: '#ff6600',
        });
        styles.child('.has-stack', '.card:has(> div .accent)', {
            textTransform: 'uppercase',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'has-stack' },
                div(
                    { className: 'card' },
                    h2('Hero'),
                    span({ className: 'accent' }, 'Alpha'),
                ),
                div(
                    { className: 'card' },
                    div(span({ className: 'accent' }, 'Nested')),
                ),
                div(
                    { className: 'card' },
                    p('Plain'),
                ),
            ),
            { functionName: 'HasPseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'has-stack' },
                div(
                    { className: 'card' },
                    h2('Hero'),
                    span({ className: 'accent' }, 'Alpha'),
                ),
                div(
                    { className: 'card' },
                    div(span({ className: 'accent' }, 'Nested')),
                ),
                div(
                    { className: 'card' },
                    p('Plain'),
                ),
            ),
            { structName: 'HasPseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "Hero", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f), letterSpacing = 1.2.sp)');
        expect(compose).toContain('Text(text = "Alpha", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f), letterSpacing = 1.2.sp)');
        expect(compose).toContain('Text(text = "NESTED", letterSpacing = 1.2.sp)');
        expect(compose).toContain('Text(text = "Plain")');
        expect(compose).not.toContain('Text(text = "PLAIN"');
        expect(compose).not.toContain('Text(text = "NESTED", color = Color(');

        expect(swiftui).toContain('Text("Hero")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('.kerning(1.2)');
        expect(swiftui).toContain('Text("Alpha")');
        expect(swiftui).toContain('Text("NESTED")');
        expect(swiftui).toContain('Text("Plain")');
        expect(swiftui).not.toContain('Text("PLAIN")');
    });

    it('maps sibling-relative has pseudo-class selectors into native output automatically', () => {
        styles.addClass('has-sibling-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.has-sibling-stack', '.card:has(+ .badge span)', {
            color: '#ff6600',
        });
        styles.child('.has-sibling-stack', '.card:has(~ .note .accent)', {
            textTransform: 'uppercase',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'has-sibling-stack' },
                div({ className: 'card' }, p('Alpha')),
                div({ className: 'badge' }, span('Marker')),
                div({ className: 'card' }, p('Beta')),
                div({ className: 'note' }, div(span({ className: 'accent' }, 'Gamma'))),
                div({ className: 'card' }, p('Plain')),
            ),
            { functionName: 'HasSiblingPseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'has-sibling-stack' },
                div({ className: 'card' }, p('Alpha')),
                div({ className: 'badge' }, span('Marker')),
                div({ className: 'card' }, p('Beta')),
                div({ className: 'note' }, div(span({ className: 'accent' }, 'Gamma'))),
                div({ className: 'card' }, p('Plain')),
            ),
            { structName: 'HasSiblingPseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "ALPHA", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "BETA")');
        expect(compose).toContain('Text(text = "Plain")');
        expect(compose).not.toContain('Text(text = "PLAIN"');
        expect(compose).not.toContain('Text(text = "Beta", color = Color(');

        expect(swiftui).toContain('Text("ALPHA")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("BETA")');
        expect(swiftui).toContain('Text("Plain")');
        expect(swiftui).not.toContain('Text("PLAIN")');
    });

    it('maps chained relative has pseudo-class selectors into native output automatically', () => {
        styles.addClass('has-chain-stack', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        });
        styles.child('.has-chain-stack', '.lead:has(+ .badge + .note .accent)', {
            color: '#ff6600',
        });
        styles.child('.has-chain-stack', '.follow:has(~ .mid + .note .accent)', {
            textTransform: 'uppercase',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'has-chain-stack' },
                div({ className: 'card lead' }, p('Alpha')),
                div({ className: 'badge' }, span('Marker')),
                div({ className: 'note' }, div(span({ className: 'accent' }, 'Gamma'))),
                div({ className: 'card follow' }, p('Beta')),
                div({ className: 'mid' }, span('Spacer')),
                div({ className: 'note' }, span({ className: 'accent' }, 'Delta')),
                div({ className: 'card plain' }, p('Plain')),
            ),
            { functionName: 'HasChainPseudoSelectorScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'has-chain-stack' },
                div({ className: 'card lead' }, p('Alpha')),
                div({ className: 'badge' }, span('Marker')),
                div({ className: 'note' }, div(span({ className: 'accent' }, 'Gamma'))),
                div({ className: 'card follow' }, p('Beta')),
                div({ className: 'mid' }, span('Spacer')),
                div({ className: 'note' }, span({ className: 'accent' }, 'Delta')),
                div({ className: 'card plain' }, p('Plain')),
            ),
            { structName: 'HasChainPseudoSelectorScreen' },
        );

        expect(compose).toContain('Text(text = "Alpha", color = Color(red = 1f, green = 0.4f, blue = 0f, alpha = 1f))');
        expect(compose).toContain('Text(text = "BETA")');
        expect(compose).toContain('Text(text = "Plain")');
        expect(compose).not.toContain('Text(text = "PLAIN"');
        expect(compose).not.toContain('Text(text = "Beta", color = Color(');

        expect(swiftui).toContain('Text("Alpha")');
        expect(swiftui).toContain('.foregroundStyle(Color(red: 1, green: 0.4, blue: 0, opacity: 1))');
        expect(swiftui).toContain('Text("BETA")');
        expect(swiftui).toContain('Text("Plain")');
        expect(swiftui).not.toContain('Text("PLAIN")');
    });

    it('reuses shared state bindings across native text, inputs, and toggles', () => {
        const query = createState('Search term');
        const enabled = createState(true);

        const compose = renderAndroidCompose(
            div(
                span(query),
                input({ ...bindValue(query), placeholder: 'Search' }),
                input({ type: 'checkbox', ...bindChecked(enabled) }),
                span(enabled),
            ),
            { functionName: 'BoundStateScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                span(query),
                input({ ...bindValue(query), placeholder: 'Search' }),
                input({ type: 'checkbox', ...bindChecked(enabled) }),
                span(enabled),
            ),
            { structName: 'BoundStateScreen' },
        );

        expect(compose).toContain('var nativeState0 by remember { mutableStateOf("Search term") }');
        expect(compose).toContain('var nativeState1 by remember { mutableStateOf(true) }');
        expect(compose).toContain('Text(text = nativeState0)');
        expect(compose).toContain('value = nativeState0');
        expect(compose).toContain('checked = nativeState1');
        expect(compose).not.toContain('textFieldValue0');
        expect(compose).not.toContain('toggleValue0');

        expect(swiftui).toContain('@State private var nativeState0 = "Search term"');
        expect(swiftui).toContain('@State private var nativeState1 = true');
        expect(swiftui).toContain('Text(nativeState0)');
        expect(swiftui).toContain('TextField("Search", text: $nativeState0)');
        expect(swiftui).toContain('Toggle("", isOn: $nativeState1)');
    });

    it('applies media queries and supported pseudo-class selectors in native style resolution', () => {
        styles.addClass('card', {
            padding: '32px',
            maxWidth: '420px',
        });
        styles.addClass('field', {
            border: '1px solid rgba(38, 25, 20, 0.12)',
        });
        styles.addClass('field:focus', {
            border: '2px solid #d56e43',
        });
        styles.mediaMaxWidth('800px', {
            '.card': {
                padding: '12px',
                maxWidth: '280px',
            },
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'card' },
                input({ className: 'field', value: 'abc', placeholder: 'Search', autoFocus: true }),
            ),
            { functionName: 'ResponsiveNativeScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'card' },
                input({ className: 'field', value: 'abc', placeholder: 'Search', autoFocus: true }),
            ),
            { structName: 'ResponsiveNativeScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.widthIn(max = 280.dp).padding(12.dp))');
        expect(compose).toContain('modifier = Modifier.focusRequester(textFieldFocusRequester0).border(2.dp, Color(');

        expect(swiftui).toContain('.padding(12)');
        expect(swiftui).toContain('.frame(maxWidth: 280)');
        expect(swiftui).toContain('.overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(');
    });

    it('only applies native focus selector styles when explicit focus state is present', () => {
        styles.addClass('field', {
            border: '1px solid rgba(38, 25, 20, 0.12)',
        });
        styles.addClass('field:focus', {
            border: '2px solid #d56e43',
        });

        const unfocusedCompose = renderAndroidCompose(
            input({ className: 'field', value: 'abc', placeholder: 'Search' }),
            { functionName: 'UnfocusedFieldScreen' },
        );

        const focusedCompose = renderAndroidCompose(
            input({ className: 'field', value: 'abc', placeholder: 'Search', autoFocus: true }),
            { functionName: 'FocusedFieldScreen' },
        );

        const unfocusedSwiftui = renderSwiftUI(
            input({ className: 'field', value: 'abc', placeholder: 'Search' }),
            { structName: 'UnfocusedFieldScreen' },
        );

        const focusedSwiftui = renderSwiftUI(
            input({ className: 'field', value: 'abc', placeholder: 'Search', autoFocus: true }),
            { structName: 'FocusedFieldScreen' },
        );

        expect(unfocusedCompose).toContain('border(1.dp, Color(');
        expect(unfocusedCompose).not.toContain('border(2.dp, Color(');
        expect(focusedCompose).toContain('border(2.dp, Color(');

        expect(unfocusedSwiftui).toContain('lineWidth: 1');
        expect(unfocusedSwiftui).not.toContain('lineWidth: 2');
        expect(focusedSwiftui).toContain('lineWidth: 2');
    });

    it('applies id selectors and cascade layers in native style resolution', () => {
        styles.layerOrder('base', 'components');
        styles.layer('base', {
            '.card': {
                color: '#5d4335',
                padding: '8px',
            },
        });
        styles.layer('components', {
            '#hero-card': {
                padding: '20px',
            },
        });
        styles.addClass('card', {
            maxWidth: '320px',
        });

        const compose = renderAndroidCompose(
            div(
                { id: 'hero-card', className: 'card' },
                span('Layered card'),
            ),
            { functionName: 'LayeredCardScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { id: 'hero-card', className: 'card' },
                span('Layered card'),
            ),
            { structName: 'LayeredCardScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.widthIn(max = 320.dp).padding(20.dp))');
        expect(compose).toContain('Text(text = "Layered card", color = Color(');

        expect(swiftui).toContain('.frame(maxWidth: 320)');
        expect(swiftui).toContain('.padding(20)');
        expect(swiftui).toContain('Text("Layered card")');
        expect(swiftui).toContain('.foregroundStyle(Color(');
    });

    it('applies supports queries in native style resolution', () => {
        styles.addClass('layout', {
            display: 'flex',
            gap: '12px',
        });
        styles.supports('display: grid', {
            '.layout': {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
            },
        });
        styles.addClass('glass', {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '24px',
            padding: '16px',
        });
        styles.supports('backdrop-filter: blur(10px)', {
            '.glass': {
                backgroundColor: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(10px)',
            },
        });

        const compose = renderAndroidCompose(
            div(
                div(
                    { className: 'layout' },
                    div(span('Alpha')),
                    div(span('Beta')),
                ),
                div({ className: 'glass' }, span('Glass surface')),
            ),
            { functionName: 'SupportsNativeScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div(
                    { className: 'layout' },
                    div(span('Alpha')),
                    div(span('Beta')),
                ),
                div({ className: 'glass' }, span('Glass surface')),
            ),
            { structName: 'SupportsNativeScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp))');
        expect(compose).toContain('Box(modifier = Modifier.weight(1f).fillMaxWidth())');
        expect(compose).toContain('shadow(elevation = 12.dp, shape = RoundedCornerShape(24.dp))');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 20) {');
        expect(swiftui).toContain('.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))');
    });

    it('applies named container queries in native style resolution', () => {
        styles.addContainer('card-container', {
            containerType: 'inline-size',
            width: '420px',
        });
        styles.addClass('card-title', {
            fontSize: '16px',
            color: '#261914',
        });
        styles.container('min-width: 400px', {
            '.card-title': {
                fontSize: '24px',
            },
        }, 'card-container');
        styles.container('min-width: 500px', {
            '.card-title': {
                fontSize: '32px',
            },
        }, 'card-container');

        const compose = renderAndroidCompose(
            div(
                { className: 'card-container' },
                span({ className: 'card-title' }, 'Responsive title'),
            ),
            { functionName: 'ContainerNativeScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'card-container' },
                span({ className: 'card-title' }, 'Responsive title'),
            ),
            { structName: 'ContainerNativeScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.width(420.dp))');
        expect(compose).toContain('Text(text = "Responsive title", color = Color(');
        expect(compose).toContain('fontSize = 24.sp');
        expect(compose).not.toContain('fontSize = 32.sp');

        expect(swiftui).toContain('.frame(width: 420)');
        expect(swiftui).toContain('Text("Responsive title")');
        expect(swiftui).toContain('.font(.system(size: 24))');
    });

    it('maps order, aspect-ratio, opacity, and z-index into native layout output', () => {
        styles.addClass('deck', {
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('card-primary', {
            width: '160px',
            aspectRatio: '16 / 9',
            background: '#fff',
            opacity: 0.45,
            zIndex: 3,
            order: 2,
        });
        styles.addClass('card-secondary', {
            width: '120px',
            order: -1,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'deck' },
                div({ className: 'card-primary' }, span('Primary')),
                div({ className: 'card-secondary' }, span('Secondary')),
            ),
            { functionName: 'OrderedDeckScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'deck' },
                div({ className: 'card-primary' }, span('Primary')),
                div({ className: 'card-secondary' }, span('Secondary')),
            ),
            { structName: 'OrderedDeckScreen' },
        );

        expect(compose.indexOf('Text(text = "Secondary")')).toBeLessThan(compose.indexOf('Text(text = "Primary")'));
        expect(compose).toContain('aspectRatio(1.778f)');
        expect(compose).toContain('.alpha(0.45f)');
        expect(compose).toContain('.zIndex(3f)');

        expect(swiftui.indexOf('Text("Secondary")')).toBeLessThan(swiftui.indexOf('Text("Primary")'));
        expect(swiftui).toContain('.aspectRatio(1.778, contentMode: .fit)');
        expect(swiftui).toContain('.opacity(0.45)');
        expect(swiftui).toContain('.zIndex(3)');
    });

    it('clips overflow-hidden containers in native output', () => {
        styles.addClass('crop-frame', {
            width: '160px',
            height: '90px',
            background: '#fff',
            overflow: 'hidden',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'crop-frame' },
                div({ style: { width: '220px', height: '120px', background: '#d56e43' } }, span('Oversized media')),
            ),
            { functionName: 'OverflowClipScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'crop-frame' },
                div({ style: { width: '220px', height: '120px', background: '#d56e43' } }, span('Oversized media')),
            ),
            { structName: 'OverflowClipScreen' },
        );

        expect(compose).toContain('clip(RectangleShape)');
        expect(swiftui).toContain('.clipped()');
    });

    it('resolves percentage sizing against parent available space in native output', () => {
        styles.addClass('shell', {
            width: '320px',
            height: '200px',
        });
        styles.addClass('panel', {
            width: '50%',
            height: '50%',
            maxWidth: '80%',
            minHeight: '25%',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'shell' },
                div({ className: 'panel' }, span('Percent panel')),
            ),
            { functionName: 'PercentSizingScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'shell' },
                div({ className: 'panel' }, span('Percent panel')),
            ),
            { structName: 'PercentSizingScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.width(320.dp).height(200.dp))');
        expect(compose).toContain('Column(modifier = Modifier.width(160.dp).height(100.dp).widthIn(max = 256.dp).heightIn(min = 50.dp))');

        expect(swiftui).toContain('.frame(width: 320, height: 200)');
        expect(swiftui).toContain('.frame(width: 160, height: 100, maxWidth: 256, minHeight: 50)');
    });

    it('maps flex-basis and non-shrinking flex items into native output', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('badge', {
            display: 'flex',
            flexDirection: 'row',
            flexBasis: '30%',
            flexShrink: 0,
        });
        styles.addClass('content', {
            flex: 1,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
                div({ className: 'content' }, span('Content')),
            ),
            { functionName: 'FlexBasisScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
                div({ className: 'content' }, span('Content')),
            ),
            { structName: 'FlexBasisScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(320.dp), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.width(96.dp).widthIn(min = 96.dp))');
        expect(compose).toContain('Column(modifier = Modifier.weight(1f))');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 96, minWidth: 96)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
    });

    it('treats shrinkable flex-basis as a max-size hint in native output', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('badge', {
            display: 'flex',
            flexDirection: 'row',
            flexBasis: '40%',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
            ),
            { functionName: 'ShrinkableFlexBasisScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
            ),
            { structName: 'ShrinkableFlexBasisScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(320.dp), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.widthIn(max = 128.dp))');
        expect(compose).not.toContain('Row(modifier = Modifier.width(128.dp)');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(maxWidth: 128)');
        expect(swiftui).not.toContain('.frame(width: 128');
    });

    it('negotiates shrinkable flex-basis across sibling flex items', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('item', {
            display: 'flex',
            flexDirection: 'row',
            flexBasis: '60%',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { functionName: 'FlexShrinkNegotiationScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { structName: 'FlexShrinkNegotiationScreen' },
        );

        expect((compose.match(/Row\(modifier = Modifier\.widthIn\(max = 154\.dp\)\)/g) ?? []).length).toBe(2);
        expect((swiftui.match(/\.frame\(maxWidth: 154\)/g) ?? []).length).toBe(2);
    });

    it('weights sibling flex shrink negotiation by flex-shrink values', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('primary', {
            display: 'flex',
            flexDirection: 'row',
            flexBasis: '180px',
            flexShrink: 1,
        });
        styles.addClass('secondary', {
            display: 'flex',
            flexDirection: 'row',
            flexBasis: '180px',
            flexShrink: 2,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { functionName: 'WeightedFlexShrinkScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { structName: 'WeightedFlexShrinkScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.widthIn(max = 162.667.dp))');
        expect(compose).toContain('Row(modifier = Modifier.widthIn(max = 145.333.dp))');

        expect(swiftui).toContain('.frame(maxWidth: 162.667)');
        expect(swiftui).toContain('.frame(maxWidth: 145.333)');
    });

    it('negotiates shrinkable explicit widths across sibling flex items', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('item', {
            width: '180px',
            flexShrink: 1,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { functionName: 'ExplicitWidthFlexShrinkScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { structName: 'ExplicitWidthFlexShrinkScreen' },
        );

        expect((compose.match(/Column\(modifier = Modifier\.widthIn\(max = 154\.dp\)\)/g) ?? []).length).toBe(2);
        expect(compose).not.toContain('Column(modifier = Modifier.width(180.dp))');

        expect((swiftui.match(/\.frame\(maxWidth: 154\)/g) ?? []).length).toBe(2);
        expect(swiftui).not.toContain('.frame(width: 180');
    });

    it('keeps explicit min-width clamps while shrinking flex items', () => {
        styles.addClass('toolbar', {
            width: '300px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('primary', {
            width: '180px',
            minWidth: '170px',
            flexShrink: 1,
        });
        styles.addClass('secondary', {
            width: '180px',
            flexShrink: 1,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { functionName: 'ExplicitWidthMinClampScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { structName: 'ExplicitWidthMinClampScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.widthIn(min = 170.dp, max = 170.dp))');
        expect(compose).toContain('Column(modifier = Modifier.widthIn(max = 118.dp))');

        expect(swiftui).toContain('.frame(minWidth: 170, maxWidth: 170)');
        expect(swiftui).toContain('.frame(maxWidth: 118)');
    });

    it('negotiates shrinkable explicit heights across column flex items', () => {
        styles.addClass('stack', {
            height: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        });
        styles.addClass('item', {
            height: '180px',
            flexShrink: 1,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'stack' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { functionName: 'ExplicitHeightFlexShrinkScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'stack' },
                div({ className: 'item' }, span('One')),
                div({ className: 'item' }, span('Two')),
            ),
            { structName: 'ExplicitHeightFlexShrinkScreen' },
        );

        expect((compose.match(/Column\(modifier = Modifier\.fillMaxWidth\(\)\.heightIn\(max = 154\.dp\)\)/g) ?? []).length).toBe(2);
        expect(compose).not.toContain('Column(modifier = Modifier.fillMaxWidth().height(180.dp))');

        expect((swiftui.match(/\.frame\(maxWidth: \.infinity, maxHeight: 154\)/g) ?? []).length).toBe(2);
        expect(swiftui).not.toContain('.frame(maxWidth: .infinity, height: 180');
    });

    it('maps common css flex shorthand tuples into native output', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('badge', {
            display: 'flex',
            flexDirection: 'row',
            flex: '0 0 30%',
        });
        styles.addClass('content', {
            flex: '1 1 0%',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
                div({ className: 'content' }, span('Content')),
            ),
            { functionName: 'FlexShorthandScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'badge' }, span('Badge')),
                div({ className: 'content' }, span('Content')),
            ),
            { structName: 'FlexShorthandScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(320.dp), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.width(96.dp).widthIn(min = 96.dp))');
        expect(compose).toContain('Column(modifier = Modifier.weight(1f))');
        expect(compose).not.toContain('widthIn(max = 0.dp)');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 96, minWidth: 96)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
        expect(swiftui).toContain('.layoutPriority(1)');
        expect(swiftui).not.toContain('.frame(maxWidth: 0)');
    });

    it('does not turn single-number flex shorthand into a zero-size constraint', () => {
        styles.addClass('toolbar', {
            width: '320px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
        });
        styles.addClass('primary', {
            flex: '1',
        });
        styles.addClass('secondary', {
            flex: '2',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { functionName: 'NumericFlexShorthandScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'toolbar' },
                div({ className: 'primary' }, span('Primary')),
                div({ className: 'secondary' }, span('Secondary')),
            ),
            { structName: 'NumericFlexShorthandScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.weight(1f))');
        expect(compose).toContain('Column(modifier = Modifier.weight(2f))');
        expect(compose).not.toContain('widthIn(max = 0.dp)');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect((swiftui.match(/\.frame\(maxWidth: \.infinity, alignment: \.leading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(swiftui).toContain('.layoutPriority(1)');
        expect(swiftui).toContain('.layoutPriority(2)');
        expect(swiftui).not.toContain('.frame(maxWidth: 0)');
    });

    it('maps translate scale and rotate transforms into native output', () => {
        styles.addClass('motion-card', {
            width: '180px',
            height: '120px',
            background: '#fff',
            transform: 'translate(12px, -6px) scale(1.08, 0.96) rotate(12deg)',
        });

        const compose = renderAndroidCompose(
            div(
                div({ className: 'motion-card' }, span('Transform card')),
            ),
            { functionName: 'TransformScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div({ className: 'motion-card' }, span('Transform card')),
            ),
            { structName: 'TransformScreen' },
        );

        expect(compose).toContain('Modifier.width(180.dp).height(120.dp).background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).offset(x = 12.dp, y = -6.dp).graphicsLayer(scaleX = 1.08f, scaleY = 0.96f, rotationZ = 12f)');
        expect(swiftui).toContain('.offset(x: 12, y: -6)');
        expect(swiftui).toContain('.scaleEffect(x: 1.08, y: 0.96, anchor: .center)');
        expect(swiftui).toContain('.rotationEffect(.degrees(12))');
    });

    it('maps align-self overrides for flex children into native output', () => {
        styles.addClass('row-shell', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            height: '120px',
            gap: '12px',
        });
        styles.addClass('column-shell', {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '220px',
            gap: '12px',
        });
        styles.addClass('self-center', {
            width: '60px',
            height: '32px',
            alignSelf: 'center',
        });
        styles.addClass('self-end', {
            width: '60px',
            height: '32px',
            alignSelf: 'flex-end',
        });

        const compose = renderAndroidCompose(
            div(
                div(
                    { className: 'row-shell' },
                    div({ className: 'self-center' }, span('Center row')),
                    div({ className: 'self-end' }, span('End row')),
                ),
                div(
                    { className: 'column-shell' },
                    div({ className: 'self-center' }, span('Center column')),
                    div({ className: 'self-end' }, span('End column')),
                ),
            ),
            { functionName: 'AlignSelfScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                div(
                    { className: 'row-shell' },
                    div({ className: 'self-center' }, span('Center row')),
                    div({ className: 'self-end' }, span('End row')),
                ),
                div(
                    { className: 'column-shell' },
                    div({ className: 'self-center' }, span('Center column')),
                    div({ className: 'self-end' }, span('End column')),
                ),
            ),
            { structName: 'AlignSelfScreen' },
        );

        expect(compose).toContain('Modifier.width(60.dp).height(32.dp).align(Alignment.CenterVertically)');
        expect(compose).toContain('Modifier.width(60.dp).height(32.dp).align(Alignment.Bottom)');
        expect(compose).toContain('Modifier.width(60.dp).height(32.dp).align(Alignment.CenterHorizontally)');
        expect(compose).toContain('Modifier.width(60.dp).height(32.dp).align(Alignment.End)');

        expect(swiftui).toContain('.frame(maxHeight: .infinity, alignment: .center)');
        expect(swiftui).toContain('.frame(maxHeight: .infinity, alignment: .bottomLeading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .center)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .trailing)');
    });

    it('maps align-self stretch for flex children into native output', () => {
        styles.addClass('row-shell', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            height: '120px',
            gap: '12px',
        });
        styles.addClass('stretch-child', {
            width: '60px',
            alignSelf: 'stretch',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'row-shell' },
                div({ className: 'stretch-child' }, span('Stretch')),
            ),
            { functionName: 'StretchAlignSelfScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'row-shell' },
                div({ className: 'stretch-child' }, span('Stretch')),
            ),
            { structName: 'StretchAlignSelfScreen' },
        );

        expect(compose).toContain('Modifier.width(60.dp).fillMaxHeight()');
        expect(swiftui).toContain('.frame(maxHeight: .infinity, alignment: .topLeading)');
    });

    it('does not stretch baseline-aligned flex children when row align-items stretches', () => {
        styles.addClass('stretch-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            width: '240px',
            height: '120px',
            gap: '12px',
        });
        styles.addClass('baseline-card', {
            width: '80px',
            padding: '12px',
            background: '#fff',
            alignSelf: 'baseline',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'stretch-row' },
                div({ className: 'baseline-card' }, span('Baseline card')),
            ),
            { functionName: 'BaselineAlignSelfStretchScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'stretch-row' },
                div({ className: 'baseline-card' }, span('Baseline card')),
            ),
            { structName: 'BaselineAlignSelfStretchScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(240.dp).height(120.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top)');
        expect(compose).toContain('Column(modifier = Modifier.width(80.dp).background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).padding(12.dp))');
        expect(compose).not.toContain('Column(modifier = Modifier.width(80.dp).fillMaxHeight().background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).padding(12.dp))');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {' );
        expect(swiftui).toContain('.frame(width: 80)');
        expect(swiftui).not.toContain('.frame(width: 80, maxHeight: .infinity)');
    });

    it('maps align-items stretch for auto-sized flex children into native output', () => {
        styles.addClass('stretch-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            width: '240px',
            height: '120px',
            gap: '12px',
        });
        styles.addClass('stretch-card', {
            width: '80px',
            padding: '12px',
            background: '#fff',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'stretch-row' },
                div({ className: 'stretch-card' }, span('Stretch card')),
            ),
            { functionName: 'AlignItemsStretchScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'stretch-row' },
                div({ className: 'stretch-card' }, span('Stretch card')),
            ),
            { structName: 'AlignItemsStretchScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(240.dp).height(120.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top)');
        expect(compose).toContain('Column(modifier = Modifier.width(80.dp).fillMaxHeight().background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).padding(12.dp))');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 80, maxHeight: .infinity)');
    });

    it('implicitly stretches row flex children when the container has an explicit cross size', () => {
        styles.addClass('implicit-stretch-row', {
            display: 'flex',
            flexDirection: 'row',
            width: '240px',
            height: '120px',
            gap: '12px',
        });
        styles.addClass('implicit-stretch-card', {
            width: '80px',
            padding: '12px',
            background: '#fff',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'implicit-stretch-row' },
                div({ className: 'implicit-stretch-card' }, span('Implicit stretch card')),
            ),
            { functionName: 'ImplicitAlignItemsStretchScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'implicit-stretch-row' },
                div({ className: 'implicit-stretch-card' }, span('Implicit stretch card')),
            ),
            { structName: 'ImplicitAlignItemsStretchScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(240.dp).height(120.dp), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Column(modifier = Modifier.width(80.dp).fillMaxHeight().background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).padding(12.dp))');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 80, maxHeight: .infinity)');
    });

    it('does not implicitly stretch row flex children without an explicit cross size', () => {
        styles.addClass('auto-row', {
            display: 'flex',
            flexDirection: 'row',
            width: '240px',
            gap: '12px',
        });
        styles.addClass('auto-row-card', {
            width: '80px',
            padding: '12px',
            background: '#fff',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'auto-row' },
                div({ className: 'auto-row-card' }, span('Auto row card')),
            ),
            { functionName: 'AutoHeightFlexRowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'auto-row' },
                div({ className: 'auto-row-card' }, span('Auto row card')),
            ),
            { structName: 'AutoHeightFlexRowScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.width(240.dp), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Column(modifier = Modifier.width(80.dp).background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).padding(12.dp))');
        expect(compose).not.toContain('fillMaxHeight()');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 80)');
        expect(swiftui).not.toContain('.frame(width: 80, maxHeight: .infinity)');
    });

    it('does not force column flex children to stretch when align-items centers them', () => {
        styles.addClass('center-column', {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '220px',
            gap: '12px',
        });
        styles.addClass('center-badge', {
            padding: '12px',
            background: '#ff0000',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'center-column' },
                div({ className: 'center-badge' }, span('Centered badge')),
            ),
            { functionName: 'CenteredFlexColumnScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'center-column' },
                div({ className: 'center-badge' }, span('Centered badge')),
            ),
            { structName: 'CenteredFlexColumnScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.width(220.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally)');
        expect(compose).toContain('Column(modifier = Modifier.background(Color(red = 1f, green = 0f, blue = 0f, alpha = 1f)).padding(12.dp))');
        expect((compose.match(/fillMaxWidth\(\)/g) ?? []).length).toBe(0);

        expect(swiftui).toContain('VStack(alignment: .center, spacing: 12) {');
        expect((swiftui.match(/\.frame\(maxWidth: \.infinity, alignment: \.leading\)/g) ?? []).length).toBe(0);
    });

    it('maps row baseline alignment for text-heavy flex children into native output', () => {
        styles.addClass('baseline-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: '12px',
        });
        styles.addClass('caption', {
            fontSize: '12px',
        });
        styles.addClass('headline', {
            fontSize: '28px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'baseline-row' },
                span({ className: 'caption' }, 'Caption'),
                span({ className: 'headline' }, 'Headline'),
            ),
            { functionName: 'BaselineFlexRowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'baseline-row' },
                span({ className: 'caption' }, 'Caption'),
                span({ className: 'headline' }, 'Headline'),
            ),
            { structName: 'BaselineFlexRowScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier, horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Text(text = "Caption", modifier = Modifier.alignByBaseline(), fontSize = 12.sp)');
        expect(compose).toContain('Text(text = "Headline", modifier = Modifier.alignByBaseline(), fontSize = 28.sp)');

        expect(swiftui).toContain('HStack(alignment: .firstTextBaseline, spacing: 12) {');
        expect(swiftui).toContain('Text("Caption")');
        expect(swiftui).toContain('Text("Headline")');
    });

    it('maps last-baseline row alignment into native output', () => {
        styles.addClass('last-baseline-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'last baseline',
            gap: '10px',
        });
        styles.addClass('meta', {
            fontSize: '14px',
        });
        styles.addClass('price', {
            fontSize: '32px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'last-baseline-row' },
                span({ className: 'meta' }, 'USD'),
                span({ className: 'price' }, '129'),
            ),
            { functionName: 'LastBaselineFlexRowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'last-baseline-row' },
                span({ className: 'meta' }, 'USD'),
                span({ className: 'price' }, '129'),
            ),
            { structName: 'LastBaselineFlexRowScreen' },
        );

        expect(compose).toContain('Text(text = "USD", modifier = Modifier.alignByBaseline(), fontSize = 14.sp)');
        expect(compose).toContain('Text(text = "129", modifier = Modifier.alignByBaseline(), fontSize = 32.sp)');
        expect(swiftui).toContain('HStack(alignment: .lastTextBaseline, spacing: 10) {');
    });

    it('maps text align-self baseline overrides for flex rows into native output', () => {
        styles.addClass('self-baseline-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
        });
        styles.addClass('self-baseline-caption', {
            fontSize: '12px',
            alignSelf: 'baseline',
        });
        styles.addClass('self-baseline-headline', {
            fontSize: '28px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'self-baseline-row' },
                span({ className: 'self-baseline-caption' }, 'Caption'),
                span({ className: 'self-baseline-headline' }, 'Headline'),
            ),
            { functionName: 'SelfBaselineFlexRowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'self-baseline-row' },
                span({ className: 'self-baseline-caption' }, 'Caption'),
                span({ className: 'self-baseline-headline' }, 'Headline'),
            ),
            { structName: 'SelfBaselineFlexRowScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier, horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('Text(text = "Caption", modifier = Modifier.alignByBaseline(), fontSize = 12.sp)');
        expect(compose).toContain('Text(text = "Headline", fontSize = 28.sp)');

        expect(swiftui).toContain('HStack(alignment: .firstTextBaseline, spacing: 12) {');
        expect(swiftui).toContain('Text("Caption")');
        expect(swiftui).toContain('Text("Headline")');
    });

    it('maps text align-self last-baseline overrides for flex rows into native output', () => {
        styles.addClass('self-last-baseline-row', {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
        });
        styles.addClass('self-last-baseline-meta', {
            fontSize: '14px',
            alignSelf: 'last baseline',
        });
        styles.addClass('self-last-baseline-price', {
            fontSize: '32px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'self-last-baseline-row' },
                span({ className: 'self-last-baseline-meta' }, 'USD'),
                span({ className: 'self-last-baseline-price' }, '129'),
            ),
            { functionName: 'SelfLastBaselineFlexRowScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'self-last-baseline-row' },
                span({ className: 'self-last-baseline-meta' }, 'USD'),
                span({ className: 'self-last-baseline-price' }, '129'),
            ),
            { structName: 'SelfLastBaselineFlexRowScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier, horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('Text(text = "USD", modifier = Modifier.alignByBaseline(), fontSize = 14.sp)');
        expect(compose).toContain('Text(text = "129", fontSize = 32.sp)');

        expect(swiftui).toContain('HStack(alignment: .lastTextBaseline, spacing: 10) {');
        expect(swiftui).toContain('Text("USD")');
        expect(swiftui).toContain('Text("129")');
    });

    it('maps relative directional offsets into native output', () => {
        styles.addClass('nudge', {
            position: 'relative',
            left: '10px',
            bottom: '6px',
            width: '80px',
            height: '24px',
            background: '#fff',
        });

        const compose = renderAndroidCompose(
            div(div({ className: 'nudge' }, span('Relative chip'))),
            { functionName: 'RelativePositionScreen' },
        );

        const swiftui = renderSwiftUI(
            div(div({ className: 'nudge' }, span('Relative chip'))),
            { structName: 'RelativePositionScreen' },
        );

        expect(compose).toContain('Modifier.width(80.dp).height(24.dp).background(Color(red = 1f, green = 1f, blue = 1f, alpha = 1f)).offset(x = 10.dp, y = -6.dp)');
        expect(swiftui).toContain('.offset(x: 10, y: -6)');
    });

    it('maps absolute positioned children as overlays in native output', () => {
        styles.addClass('badge-shell', {
            width: '240px',
            height: '140px',
            position: 'relative',
            background: '#fff',
        });
        styles.addClass('badge', {
            position: 'absolute',
            top: '8px',
            right: '12px',
            width: '64px',
            height: '28px',
            background: '#d56e43',
            zIndex: 4,
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'badge-shell' },
                span('Body copy'),
                div({ className: 'badge' }, span('Badge')),
            ),
            { functionName: 'AbsoluteOverlayScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'badge-shell' },
                span('Body copy'),
                div({ className: 'badge' }, span('Badge')),
            ),
            { structName: 'AbsoluteOverlayScreen' },
        );

        expect(compose).toContain('Box(modifier = Modifier.matchParentSize())');
        expect(compose).toContain('align(Alignment.TopEnd).offset(x = -12.dp, y = 8.dp).zIndex(4f)');

        expect(swiftui).toContain('.overlay(alignment: .topLeading) {');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)');
        expect(swiftui).toContain('.offset(x: -12, y: 8)');
    });

    it('maps fixed positioned screen children as viewport overlays in native output', () => {
        styles.addClass('floating-cta', {
            position: 'fixed',
            right: '16px',
            bottom: '20px',
            width: '84px',
            height: '36px',
            background: '#d56e43',
            zIndex: 9,
        });

        const compose = renderAndroidCompose(
            main(
                span('Body copy'),
                div({ className: 'floating-cta' }, span('CTA')),
            ),
            { functionName: 'FixedOverlayScreen' },
        );

        const swiftui = renderSwiftUI(
            main(
                span('Body copy'),
                div({ className: 'floating-cta' }, span('CTA')),
            ),
            { structName: 'FixedOverlayScreen' },
        );

        expect(compose).toContain('Box(modifier = Modifier.matchParentSize())');
        expect(compose).toContain('align(Alignment.BottomEnd).offset(x = -16.dp, y = -20.dp).zIndex(9f)');

        expect(swiftui).toContain('.overlay(alignment: .topLeading) {');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)');
        expect(swiftui).toContain('.offset(x: -16, y: -20)');
    });

    it('keeps native parity overrides aligned with hybrid-style mobile layouts', () => {
        styles.addClass('page', {
            padding: '40px 24px 80px',
        });
        styles.addClass('hero', {
            width: '100%',
            padding: '32px',
        });
        styles.addClass('hero-layout', {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
        });
        styles.addClass('hero-badge', {
            width: '84px',
            height: '84px',
        });
        styles.addClass('hero-badge-mark', {
            fontSize: '28px',
        });
        styles.addClass('hero-layout-native', {
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
        });
        styles.addClass('panel-grid', {
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '20px',
        });
        styles.mediaMaxWidth('800px', {
            '.page': {
                padding: '20px 16px 48px',
            },
            '.hero': {
                padding: '24px',
            },
            '.hero-badge': {
                width: '72px',
                height: '72px',
            },
            '.hero-badge-mark': {
                fontSize: '24px',
            },
            '.panel-grid': {
                gridTemplateColumns: '1fr',
            },
            '.hero-layout-native .hero-badge': {
                width: '84px',
                height: '84px',
            },
            '.hero-layout-native .hero-badge-mark': {
                fontSize: '28px',
            },
            '.page-native': {
                padding: '40px 24px 80px',
            },
            '.hero-native': {
                padding: '32px',
            },
            '.panel-grid-native': {
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
            },
        });

        const compose = renderAndroidCompose(
            main(
                { className: 'page page-native' },
                div(
                    { className: 'hero hero-native' },
                    div(
                        { className: 'hero-layout hero-layout-native' },
                        div(
                            { className: 'hero-badge' },
                            span({ className: 'hero-badge-mark' }, 'EU'),
                        ),
                        div('Hero copy'),
                    ),
                ),
                div(
                    { className: 'panel-grid panel-grid-native' },
                    div('Left panel'),
                    div('Right panel'),
                ),
            ),
            { functionName: 'NativeParityScreen' },
        );

        const swiftui = renderSwiftUI(
            main(
                { className: 'page page-native' },
                div(
                    { className: 'hero hero-native' },
                    div(
                        { className: 'hero-layout hero-layout-native' },
                        div(
                            { className: 'hero-badge' },
                            span({ className: 'hero-badge-mark' }, 'EU'),
                        ),
                        div('Hero copy'),
                    ),
                ),
                div(
                    { className: 'panel-grid panel-grid-native' },
                    div('Left panel'),
                    div('Right panel'),
                ),
            ),
            { structName: 'NativeParityScreen' },
        );

        expect(compose).toContain('Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 40.dp, end = 24.dp, bottom = 80.dp, start = 24.dp)');
        expect(compose).toContain('// classList: hero hero-native');
        expect(compose).toContain('Column(modifier = Modifier.fillMaxWidth().padding(32.dp))');
        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically)');
        expect(compose).toContain('// classList: hero-badge');
        expect(compose).toContain('Column(modifier = Modifier.width(84.dp).height(84.dp))');
        expect(compose).toContain('fontSize = 28.sp');
        expect(compose).toContain('// classList: panel-grid panel-grid-native');
        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp))');
        expect(compose).toContain('Box(modifier = Modifier.weight(1f).fillMaxWidth())');
        expect(compose).toContain('Box(modifier = Modifier.weight(1f).fillMaxWidth())');

        expect(swiftui).toContain('.padding(.top, 40)');
        expect(swiftui).toContain('.padding(.trailing, 24)');
        expect(swiftui).toContain('.padding(.bottom, 80)');
        expect(swiftui).toContain('.padding(.leading, 24)');
        expect(swiftui).toContain('.frame(width: 84, height: 84)');
        expect(swiftui).toContain('.font(.system(size: 28))');
        expect(swiftui).toContain('HStack(alignment: .top, spacing: 16) {');
        expect(swiftui).toContain('.layoutPriority(1)');
        expect(swiftui).toContain('.layoutPriority(1)');
    });

    it('fills decorated child containers across native block layouts without explicit width', () => {
        styles.addClass('stack', {
            gap: '12px',
        });
        styles.addClass('card', {
            padding: '20px',
            borderRadius: '16px',
            background: '#fff',
            border: '1px solid rgba(38, 25, 20, 0.12)',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'stack' },
                div({ className: 'card' }, span('Card content')),
                div('Body copy'),
            ),
            { functionName: 'AutoFillCardScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'stack' },
                div({ className: 'card' }, span('Card content')),
                div('Body copy'),
            ),
            { structName: 'AutoFillCardScreen' },
        );

        expect(compose).toContain('// classList: card');
        expect(compose).toContain('Column(modifier = Modifier.fillMaxWidth().background(color = Color(red = 1f, green = 1f, blue = 1f, alpha = 1f), shape = RoundedCornerShape(16.dp)).border(1.dp, Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 0.12f), RoundedCornerShape(16.dp)).padding(20.dp))');

        expect(swiftui).toContain('// classList: card');
        expect(swiftui).toContain('.padding(20)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
    });

    it('maps rem and em text units, font families, and line-height into native text output', () => {
        styles.addClass('eyebrow', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
        });
        styles.addClass('lede', {
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: '#5d4335',
        });

        const compose = renderAndroidCompose(
            div(
                span({ className: 'eyebrow' }, 'mobile'),
                span({ className: 'lede' }, 'One repo validating browser, desktop, and Android mobile workflows.'),
            ),
            { functionName: 'TypographyScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                span({ className: 'eyebrow' }, 'mobile'),
                span({ className: 'lede' }, 'One repo validating browser, desktop, and Android mobile workflows.'),
            ),
            { structName: 'TypographyScreen' },
        );

        expect(compose).toContain('Text(text = "MOBILE", fontSize = 12.48.sp');
        expect(compose).toContain('fontFamily = FontFamily.Serif');
        expect(compose).toContain('letterSpacing = 1.28.sp');
        expect(compose).toContain('lineHeight = 28.56.sp');

        expect(swiftui).toContain('Text("MOBILE")');
        expect(swiftui).toContain('.font(.system(size: 12.48, design: .serif))');
        expect(swiftui).toContain('.kerning(1.28)');
        expect(swiftui).toContain('.lineSpacing(11.76)');
    });

    it('inherits body typography and clamps viewport-based font sizes in native output', () => {
        styles.addTag('body', {
            color: '#5d4335',
            fontFamily: 'Georgia, "Times New Roman", serif',
        });
        styles.addTag('h1', {
            fontSize: 'clamp(2.4rem, 5vw, 4.4rem)',
        });

        const compose = renderAndroidCompose(
            div(h1('Hybrid parity headline')),
            { functionName: 'ViewportTypographyScreen' },
        );

        const swiftui = renderSwiftUI(
            div(h1('Hybrid parity headline')),
            { structName: 'ViewportTypographyScreen' },
        );

        expect(compose).toContain('Text(text = "Hybrid parity headline", color = Color(');
        expect(compose).toContain('fontSize = 38.4.sp');
        expect(compose).toContain('fontFamily = FontFamily.Serif');

        expect(swiftui).toContain('Text("Hybrid parity headline")');
        expect(swiftui).toContain('.foregroundStyle(Color(');
        expect(swiftui).toContain('.font(.system(size: 38.4, design: .serif))');
    });

    it('keeps sans-serif body inheritance distinct from serif font families', () => {
        styles.addTag('body', {
            color: '#261914',
            fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        });
        styles.addTag('p', {
            lineHeight: 1.7,
        });
        styles.addClass('btn', {
            color: '#fff6ee',
            fontWeight: 700,
            lineHeight: 1.2,
        });

        const compose = renderAndroidCompose(
            div(
                p('Body copy'),
                button({ className: 'btn' }, 'CTA'),
                span('Plain span'),
            ),
            { functionName: 'SansTypographyScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                p('Body copy'),
                button({ className: 'btn' }, 'CTA'),
                span('Plain span'),
            ),
            { structName: 'SansTypographyScreen' },
        );

        expect(compose).toContain('Text(text = "Body copy", color = Color(');
        expect(compose).toContain('fontFamily = FontFamily.SansSerif, lineHeight = 27.2.sp');
        expect(compose).toContain('Text(text = "CTA", color = Color(');
        expect(compose).toContain('fontWeight = FontWeight.W700, fontFamily = FontFamily.SansSerif, lineHeight = 19.2.sp');

        expect(swiftui).toContain('Text("Body copy")');
        expect(swiftui).not.toContain('design: .serif');
    });

    it('approximates frosted backdrop surfaces in native output', () => {
        styles.addClass('glass', {
            padding: '24px',
            borderRadius: '28px',
            background: 'rgba(255, 252, 247, 0.82)',
            backdropFilter: 'blur(18px)',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'glass' },
                span('Glass surface'),
            ),
            { functionName: 'GlassScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'glass' },
                span('Glass surface'),
            ),
            { structName: 'GlassScreen' },
        );

        expect(compose).toContain('Modifier.background(color = Color(red = 1f, green = 0.988f, blue = 0.969f, alpha = 0.932f), shape = RoundedCornerShape(28.dp)).shadow(elevation = 12.dp, shape = RoundedCornerShape(28.dp)).padding(24.dp)');
        expect(swiftui).toContain('.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28))');
        expect(swiftui).toContain('.background(Color(red: 1, green: 0.988, blue: 0.969, opacity: 0.932))');
    });

    it('maps viewport units and numeric CSS functions into native layout sizing', () => {
        styles.addClass('hero-shell', {
            minHeight: '100vh',
            maxWidth: 'min(92vw, 640px)',
            padding: 'calc(1vw + 4px)',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'hero-shell' },
                span('Viewport shell'),
            ),
            { functionName: 'ViewportSizingScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'hero-shell' },
                span('Viewport shell'),
            ),
            { structName: 'ViewportSizingScreen' },
        );

        expect(compose).toContain('Modifier.widthIn(max = 358.8.dp).heightIn(min = 844.dp).padding(7.9.dp)');
        expect(swiftui).toContain('.padding(7.9)');
        expect(swiftui).toContain('.frame(maxWidth: 358.8, minHeight: 844)');
    });

    it('maps explicit grid columns into weighted native rows', () => {
        styles.addClass('grid', {
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '20px',
        });
        styles.addClass('cell', {
            padding: '12px',
            borderRadius: '16px',
            background: '#fff',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'grid' },
                div({ className: 'cell' }, span('Alpha panel')),
                div({ className: 'cell' }, span('Beta panel')),
            ),
            { functionName: 'GridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'grid' },
                div({ className: 'cell' }, span('Alpha panel')),
                div({ className: 'cell' }, span('Beta panel')),
            ),
            { structName: 'GridScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier, horizontalArrangement = Arrangement.spacedBy(20.dp))');
        expect(compose).toContain('Box(modifier = Modifier.weight(1.2f).fillMaxWidth())');
        expect(compose).toContain('Box(modifier = Modifier.weight(0.8f).fillMaxWidth())');
        expect(compose).toContain('modifier = Modifier.fillMaxWidth().background(color = Color(red = 1f, green = 1f, blue = 1f, alpha = 1f), shape = RoundedCornerShape(16.dp)).padding(12.dp)');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 20) {');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
        expect(swiftui).toContain('.layoutPriority(1.2)');
        expect(swiftui).toContain('.layoutPriority(0.8)');
    });

    it('maps practical fixed and clamped grid columns into native output', () => {
        styles.addClass('clamped-columns-grid', {
            display: 'grid',
            gridTemplateColumns: '120px minmax(96px, 180px) fit-content(140px) 1fr',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'clamped-columns-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { functionName: 'ClampedColumnsGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'clamped-columns-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { structName: 'ClampedColumnsGridScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier, horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Box(modifier = Modifier.width(120.dp))');
        expect(compose).toContain('Box(modifier = Modifier.widthIn(min = 96.dp, max = 180.dp))');
        expect(compose).toContain('Box(modifier = Modifier.widthIn(max = 140.dp))');
        expect(compose).toContain('Box(modifier = Modifier.weight(1f).fillMaxWidth())');

        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(swiftui).toContain('.frame(width: 120, alignment: .leading)');
        expect(swiftui).toContain('.frame(minWidth: 96, maxWidth: 180, alignment: .leading)');
        expect(swiftui).toContain('.frame(maxWidth: 140, alignment: .leading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .leading)');
        expect(swiftui).toContain('.layoutPriority(1)');
    });

    it('maps practical implicit auto-column clamps into native output', () => {
        styles.addClass('auto-columns-clamp-grid', {
            display: 'grid',
            gridTemplateColumns: '120px',
            gridTemplateRows: 'auto auto',
            gridAutoFlow: 'column',
            gridAutoColumns: 'fit-content(140px)',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'auto-columns-clamp-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { functionName: 'AutoColumnsClampGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'auto-columns-clamp-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { structName: 'AutoColumnsClampGridScreen' },
        );

        expect((compose.match(/Box\(modifier = Modifier\.width\(120\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((compose.match(/Box\(modifier = Modifier\.widthIn\(max = 140\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);

        expect((swiftui.match(/\.frame\(width: 120, alignment: \.leading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((swiftui.match(/\.frame\(maxWidth: 140, alignment: \.leading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('maps practical intrinsic column keywords into native output', () => {
        styles.addClass('intrinsic-columns-grid', {
            display: 'grid',
            gridTemplateColumns: 'min-content max-content',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'intrinsic-columns-grid' },
                div(span('ID')),
                input({ value: 'Primary field' }),
                div(span('Ref')),
                input({ value: 'Secondary field' }),
            ),
            { functionName: 'IntrinsicColumnsGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'intrinsic-columns-grid' },
                div(span('ID')),
                input({ value: 'Primary field' }),
                div(span('Ref')),
                input({ value: 'Secondary field' }),
            ),
            { structName: 'IntrinsicColumnsGridScreen' },
        );

        expect((compose.match(/Box\(modifier = Modifier\.width\(160\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((compose.match(/Box\(modifier = Modifier\.width\(220\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);

        expect((swiftui.match(/\.frame\(width: 160, alignment: \.leading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((swiftui.match(/\.frame\(width: 220, alignment: \.leading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('maps practical spanning width hints across mixed fixed and flexible grid columns', () => {
        styles.addClass('spanning-columns-grid', {
            display: 'grid',
            gridTemplateColumns: '120px fit-content(140px) 1fr',
            gap: '12px',
        });
        styles.addClass('wide-span-card', {
            gridColumn: '1 / span 3',
            width: '380px',
            background: '#f5f1ea',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'spanning-columns-grid' },
                div({ className: 'wide-span-card' }, span('Wide summary card')),
            ),
            { functionName: 'SpanningColumnsGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'spanning-columns-grid' },
                div({ className: 'wide-span-card' }, span('Wide summary card')),
            ),
            { structName: 'SpanningColumnsGridScreen' },
        );

        expect(compose).toContain('Box(modifier = Modifier.weight(1f).fillMaxWidth().widthIn(min = 380.dp))');
            expect(swiftui).toContain('.frame(minWidth: 380, maxWidth: .infinity, alignment: .leading)');
        expect(swiftui).toContain('.layoutPriority(1)');
    });

    it('maps practical grid row and column placement into native output', () => {
        styles.addClass('placed-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 2fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '12px',
        });
        styles.addClass('grid-hero', {
            gridColumn: '2 / span 2',
            background: '#f5f1ea',
        });
        styles.addClass('grid-summary', {
            gridRow: '2',
            gridColumn: '1 / span 2',
            background: '#e3f1ff',
        });
        styles.addClass('grid-aside', {
            gridRow: '2',
            gridColumn: '3',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'placed-grid' },
                div({ className: 'grid-summary' }, span('Summary panel')),
                div({ className: 'grid-hero' }, span('Hero panel')),
                div({ className: 'grid-aside' }, span('Aside panel')),
            ),
            { functionName: 'PlacedGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'placed-grid' },
                div({ className: 'grid-summary' }, span('Summary panel')),
                div({ className: 'grid-hero' }, span('Hero panel')),
                div({ className: 'grid-aside' }, span('Aside panel')),
            ),
            { structName: 'PlacedGridScreen' },
        );

        expect(compose.indexOf('Text(text = "Hero panel")')).toBeLessThan(compose.indexOf('Text(text = "Summary panel")'));
        expect((compose.match(/Modifier\.weight\(3f\)\.fillMaxWidth\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((compose.match(/Row\(modifier = Modifier\.fillMaxWidth\(\), horizontalArrangement = Arrangement\.spacedBy\(12\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);

        expect(swiftui.indexOf('Text("Hero panel")')).toBeLessThan(swiftui.indexOf('Text("Summary panel")'));
        expect((swiftui.match(/\.layoutPriority\(3\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((swiftui.match(/HStack\(alignment: \.top, spacing: 12\) \{/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('maps practical grid auto-flow dense and column subsets into native output', () => {
        styles.addClass('dense-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridAutoFlow: 'row dense',
            gap: '12px',
        });
        styles.addClass('column-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gridAutoFlow: 'column',
            gap: '12px',
        });
        styles.addClass('span-two', {
            gridColumn: 'span 2',
        });

        const denseCompose = renderAndroidCompose(
            div(
                { className: 'dense-grid' },
                div({ className: 'span-two' }, span('Hero card')),
                div({ className: 'span-two' }, span('Metrics card')),
                div(span('Badge card')),
            ),
            { functionName: 'DenseAutoFlowGridScreen' },
        );

        const denseSwiftui = renderSwiftUI(
            div(
                { className: 'dense-grid' },
                div({ className: 'span-two' }, span('Hero card')),
                div({ className: 'span-two' }, span('Metrics card')),
                div(span('Badge card')),
            ),
            { structName: 'DenseAutoFlowGridScreen' },
        );

        const columnCompose = renderAndroidCompose(
            div(
                { className: 'column-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { functionName: 'ColumnAutoFlowGridScreen' },
        );

        const columnSwiftui = renderSwiftUI(
            div(
                { className: 'column-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { structName: 'ColumnAutoFlowGridScreen' },
        );

        expect(denseCompose.indexOf('Text(text = "Hero card")')).toBeLessThan(denseCompose.indexOf('Text(text = "Badge card")'));
        expect(denseCompose.indexOf('Text(text = "Badge card")')).toBeLessThan(denseCompose.indexOf('Text(text = "Metrics card")'));
        expect(denseSwiftui.indexOf('Text("Hero card")')).toBeLessThan(denseSwiftui.indexOf('Text("Badge card")'));
        expect(denseSwiftui.indexOf('Text("Badge card")')).toBeLessThan(denseSwiftui.indexOf('Text("Metrics card")'));

        expect(columnCompose.indexOf('Text(text = "Alpha panel")')).toBeLessThan(columnCompose.indexOf('Text(text = "Gamma panel")'));
        expect(columnCompose.indexOf('Text(text = "Gamma panel")')).toBeLessThan(columnCompose.indexOf('Text(text = "Beta panel")'));
        expect(columnCompose.indexOf('Text(text = "Beta panel")')).toBeLessThan(columnCompose.indexOf('Text(text = "Delta panel")'));

        expect(columnSwiftui.indexOf('Text("Alpha panel")')).toBeLessThan(columnSwiftui.indexOf('Text("Gamma panel")'));
        expect(columnSwiftui.indexOf('Text("Gamma panel")')).toBeLessThan(columnSwiftui.indexOf('Text("Beta panel")'));
        expect(columnSwiftui.indexOf('Text("Beta panel")')).toBeLessThan(columnSwiftui.indexOf('Text("Delta panel")'));
    });

    it('maps practical grid auto-rows and auto-columns hints into native output', () => {
        styles.addClass('auto-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '40px',
            gridAutoRows: '72px',
            gap: '12px',
        });
        styles.addClass('auto-columns-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'auto auto',
            gridAutoFlow: 'column',
            gridAutoColumns: '2fr',
            gap: '12px',
        });

        const autoRowsCompose = renderAndroidCompose(
            div(
                { className: 'auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
            ),
            { functionName: 'AutoRowsGridScreen' },
        );

        const autoRowsSwiftui = renderSwiftUI(
            div(
                { className: 'auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
            ),
            { structName: 'AutoRowsGridScreen' },
        );

        const autoColumnsCompose = renderAndroidCompose(
            div(
                { className: 'auto-columns-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { functionName: 'AutoColumnsGridScreen' },
        );

        const autoColumnsSwiftui = renderSwiftUI(
            div(
                { className: 'auto-columns-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { structName: 'AutoColumnsGridScreen' },
        );

        expect(autoRowsCompose).toContain('height(40.dp)');
        expect(autoRowsCompose).toContain('height(72.dp)');
        expect(autoRowsSwiftui).toContain('.frame(maxWidth: .infinity, height: 40, alignment: .topLeading)');
        expect(autoRowsSwiftui).toContain('.frame(maxWidth: .infinity, height: 72, alignment: .topLeading)');

        expect((autoColumnsCompose.match(/Modifier\.weight\(2f\)\.fillMaxWidth\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((autoColumnsSwiftui.match(/\.layoutPriority\(2\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('maps practical grid row-track sizing and stretch into native output', () => {
        styles.addClass('stretch-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '12px',
            height: '220px',
            alignContent: 'stretch',
        });
        styles.addClass('tracked-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '48px minmax(72px, 1fr)',
            gap: '12px',
            height: '240px',
        });

        const stretchCompose = renderAndroidCompose(
            div(
                { className: 'stretch-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { functionName: 'StretchRowsGridScreen' },
        );

        const stretchSwiftui = renderSwiftUI(
            div(
                { className: 'stretch-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { structName: 'StretchRowsGridScreen' },
        );

        const trackedCompose = renderAndroidCompose(
            div(
                { className: 'tracked-rows-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { functionName: 'TrackedRowsGridScreen' },
        );

        const trackedSwiftui = renderSwiftUI(
            div(
                { className: 'tracked-rows-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { structName: 'TrackedRowsGridScreen' },
        );

        expect(stretchCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.spacedBy(12.dp))');
        expect((stretchCompose.match(/Row\(modifier = Modifier\.weight\(1f, fill = true\)\.fillMaxWidth\(\), horizontalArrangement = Arrangement\.spacedBy\(12\.dp\)\)/g) ?? []).length).toBeGreaterThanOrEqual(2);

        expect((stretchSwiftui.match(/\.frame\(maxWidth: \.infinity, maxHeight: \.infinity, alignment: \.topLeading\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect((stretchSwiftui.match(/\.layoutPriority\(1\)/g) ?? []).length).toBeGreaterThanOrEqual(2);

        expect(trackedCompose).toContain('Row(modifier = Modifier.height(48.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(trackedCompose).toContain('Row(modifier = Modifier.weight(1f, fill = true).heightIn(min = 72.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');

        expect(trackedSwiftui).toContain('.frame(maxWidth: .infinity, height: 48, alignment: .topLeading)');
        expect(trackedSwiftui).toContain('.frame(maxWidth: .infinity, minHeight: 72, maxHeight: .infinity, alignment: .topLeading)');
        expect(trackedSwiftui).toContain('.layoutPriority(1)');
    });

    it('keeps grid content packing inert once flexible row tracks consume free space', () => {
        styles.addClass('weighted-place-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '48px 1fr',
            gap: '12px',
            height: '240px',
            placeContent: 'center',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'weighted-place-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { functionName: 'WeightedPlaceContentScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'weighted-place-grid' },
                div(span('Alpha panel')),
                div(span('Beta panel')),
                div(span('Gamma panel')),
                div(span('Delta panel')),
            ),
            { structName: 'WeightedPlaceContentScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier.height(240.dp), verticalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).not.toContain('Alignment.CenterVertically');
        expect(compose).toContain('Row(modifier = Modifier.weight(1f, fill = true).fillMaxWidth(), horizontalArrangement = Arrangement.Center)');

        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 12) {');
        expect(swiftui).not.toContain('Spacer(minLength: 0)');
        expect(swiftui).toContain('.layoutPriority(1)');
    });

    it('maps practical fit-content rows and spanning height hints into native output', () => {
        styles.addClass('fit-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'fit-content(56px) fit-content(72px)',
            gap: '12px',
        });
        styles.addClass('spanning-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '48px auto',
            gap: '12px',
        });
        styles.addClass('spanning-card', {
            gridRow: '1 / span 2',
            height: '180px',
            background: '#f5f1ea',
        });
        styles.addClass('top-card', {
            gridColumn: '2 / 3',
            gridRow: '1 / 2',
            background: '#fff4e7',
        });
        styles.addClass('bottom-card', {
            gridColumn: '2 / 3',
            gridRow: '2 / 3',
            background: '#e3f1ff',
        });

        const fitCompose = renderAndroidCompose(
            div(
                { className: 'fit-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { functionName: 'FitRowsGridScreen' },
        );

        const fitSwiftui = renderSwiftUI(
            div(
                { className: 'fit-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { structName: 'FitRowsGridScreen' },
        );

        const spanningCompose = renderAndroidCompose(
            div(
                { className: 'spanning-rows-grid' },
                div({ className: 'spanning-card' }, span('Tall span')),
                div({ className: 'top-card' }, span('Top')),
                div({ className: 'bottom-card' }, span('Bottom')),
            ),
            { functionName: 'SpanningRowsGridScreen' },
        );

        const spanningSwiftui = renderSwiftUI(
            div(
                { className: 'spanning-rows-grid' },
                div({ className: 'spanning-card' }, span('Tall span')),
                div({ className: 'top-card' }, span('Top')),
                div({ className: 'bottom-card' }, span('Bottom')),
            ),
            { structName: 'SpanningRowsGridScreen' },
        );

        expect(fitCompose).toContain('heightIn(max = 56.dp)');
        expect(fitCompose).toContain('heightIn(max = 72.dp)');
        expect(fitSwiftui).toContain('.frame(maxWidth: .infinity, maxHeight: 56, alignment: .topLeading)');
        expect(fitSwiftui).toContain('.frame(maxWidth: .infinity, maxHeight: 72, alignment: .topLeading)');

        expect(spanningCompose).toContain('Row(modifier = Modifier.height(48.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(spanningCompose).toContain('Row(modifier = Modifier.heightIn(min = 120.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');

        expect(spanningSwiftui).toContain('.frame(maxWidth: .infinity, height: 48, alignment: .topLeading)');
        expect(spanningSwiftui).toContain('.frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)');
    });

    it('maps practical clamped minmax row tracks into native output', () => {
        styles.addClass('clamped-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'minmax(48px, 96px) minmax(auto, 88px)',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'clamped-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { functionName: 'ClampedRowsGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'clamped-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { structName: 'ClampedRowsGridScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.heightIn(min = 48.dp, max = 96.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.heightIn(max = 88.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');

        expect(swiftui).toContain('.frame(maxWidth: .infinity, minHeight: 48, maxHeight: 96, alignment: .topLeading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: 88, alignment: .topLeading)');
        expect(swiftui).not.toContain('.frame(maxWidth: .infinity, minHeight: 88, maxHeight: 88, alignment: .topLeading)');
    });

    it('maps practical implicit fit-content and flexible auto row sizing into native output', () => {
        styles.addClass('fit-auto-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '40px',
            gridAutoRows: 'fit-content(56px)',
            gap: '12px',
        });
        styles.addClass('flex-auto-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '40px',
            gridAutoRows: 'minmax(64px, 1fr)',
            gap: '12px',
            height: '240px',
        });

        const fitCompose = renderAndroidCompose(
            div(
                { className: 'fit-auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
            ),
            { functionName: 'FitAutoRowsGridScreen' },
        );

        const fitSwiftui = renderSwiftUI(
            div(
                { className: 'fit-auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
            ),
            { structName: 'FitAutoRowsGridScreen' },
        );

        const flexCompose = renderAndroidCompose(
            div(
                { className: 'flex-auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { functionName: 'FlexAutoRowsGridScreen' },
        );

        const flexSwiftui = renderSwiftUI(
            div(
                { className: 'flex-auto-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                div(span('Gamma card')),
                div(span('Delta card')),
            ),
            { structName: 'FlexAutoRowsGridScreen' },
        );

        expect(fitCompose).toContain('Row(modifier = Modifier.heightIn(max = 56.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(fitSwiftui).toContain('.frame(maxWidth: .infinity, maxHeight: 56, alignment: .topLeading)');

        expect(flexCompose).toContain('Row(modifier = Modifier.weight(1f, fill = true).heightIn(min = 64.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(flexSwiftui).toContain('.frame(maxWidth: .infinity, minHeight: 64, maxHeight: .infinity, alignment: .topLeading)');
        expect(flexSwiftui).toContain('.layoutPriority(1)');
    });

    it('maps practical intrinsic row keywords into native output', () => {
        styles.addClass('intrinsic-rows-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'min-content max-content',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'intrinsic-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                input({ value: 'Gamma field' }),
                input({ value: 'Delta field' }),
            ),
            { functionName: 'IntrinsicRowsGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'intrinsic-rows-grid' },
                div(span('Alpha card')),
                div(span('Beta card')),
                input({ value: 'Gamma field' }),
                input({ value: 'Delta field' }),
            ),
            { structName: 'IntrinsicRowsGridScreen' },
        );

        expect(compose).toContain('Row(modifier = Modifier.height(24.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.height(44.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');

        expect(swiftui).toContain('.frame(maxWidth: .infinity, height: 24, alignment: .topLeading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, height: 44, alignment: .topLeading)');
    });

    it('maps practical grid item alignment props into native output', () => {
        styles.addClass('aligned-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '80px',
            gap: '12px',
            justifyItems: 'center',
            alignItems: 'end',
        });
        styles.addClass('aligned-card', {
            width: '72px',
            height: '24px',
            background: '#f5f1ea',
        });
        styles.addClass('self-aligned-card', {
            justifySelf: 'end',
            alignSelf: 'start',
            width: '60px',
            height: '24px',
            background: '#e3f1ff',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'aligned-grid' },
                div({ className: 'aligned-card' }, span('Centered card')),
                div({ className: 'self-aligned-card' }, span('Override card')),
            ),
            { functionName: 'AlignedGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'aligned-grid' },
                div({ className: 'aligned-card' }, span('Centered card')),
                div({ className: 'self-aligned-card' }, span('Override card')),
            ),
            { structName: 'AlignedGridScreen' },
        );

        expect(compose).toContain('height(80.dp)');
        expect(compose).toContain('contentAlignment = Alignment.BottomCenter');
        expect(compose).toContain('contentAlignment = Alignment.TopEnd');
        expect(compose).toContain('width(72.dp).height(24.dp)');
        expect(compose).toContain('width(60.dp).height(24.dp)');

        expect(swiftui).toContain('.frame(maxWidth: .infinity, height: 80, alignment: .topLeading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)');
        expect(swiftui).toContain('.frame(width: 72, height: 24)');
        expect(swiftui).toContain('.frame(width: 60, height: 24)');
    });

    it('maps place-items and place-self shorthands into native grid output', () => {
        styles.addClass('place-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '96px',
            gap: '12px',
            placeItems: 'center',
        });
        styles.addClass('place-card', {
            width: '64px',
            height: '24px',
            background: '#fff4e7',
        });
        styles.addClass('place-self-card', {
            placeSelf: 'start end',
            width: '56px',
            height: '24px',
            background: '#f5f1ea',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'place-grid' },
                div({ className: 'place-card' }, span('Centered shorthand')),
                div({ className: 'place-self-card' }, span('Self shorthand')),
            ),
            { functionName: 'PlaceGridScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'place-grid' },
                div({ className: 'place-card' }, span('Centered shorthand')),
                div({ className: 'place-self-card' }, span('Self shorthand')),
            ),
            { structName: 'PlaceGridScreen' },
        );

        expect(compose).toContain('height(96.dp)');
        expect(compose).toContain('contentAlignment = Alignment.Center');
        expect(compose).toContain('contentAlignment = Alignment.TopEnd');

        expect(swiftui).toContain('.frame(maxWidth: .infinity, height: 96, alignment: .topLeading)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)');
    });

    it('maps practical grid-area shorthand into native output', () => {
        styles.addClass('area-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '12px',
        });
        styles.addClass('area-hero', {
            gridArea: '1 / 2 / 3 / 4',
            background: '#f5f1ea',
        });
        styles.addClass('area-summary', {
            gridArea: '1 / 1 / 2 / 2',
            background: '#e3f1ff',
        });
        styles.addClass('area-aside', {
            gridArea: '2 / 1 / 3 / 2',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'area-grid' },
                div({ className: 'area-aside' }, span('Aside area')),
                div({ className: 'area-hero' }, span('Hero area')),
                div({ className: 'area-summary' }, span('Summary area')),
            ),
            { functionName: 'GridAreaScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'area-grid' },
                div({ className: 'area-aside' }, span('Aside area')),
                div({ className: 'area-hero' }, span('Hero area')),
                div({ className: 'area-summary' }, span('Summary area')),
            ),
            { structName: 'GridAreaScreen' },
        );

        expect(compose.indexOf('Text(text = "Summary area")')).toBeLessThan(compose.indexOf('Text(text = "Hero area")'));
        expect(compose.indexOf('Text(text = "Hero area")')).toBeLessThan(compose.indexOf('Text(text = "Aside area")'));
        expect(compose).toContain('Modifier.weight(2f).fillMaxWidth()');

        expect(swiftui.indexOf('Text("Summary area")')).toBeLessThan(swiftui.indexOf('Text("Hero area")'));
        expect(swiftui.indexOf('Text("Hero area")')).toBeLessThan(swiftui.indexOf('Text("Aside area")'));
        expect(swiftui).toContain('.layoutPriority(2)');
    });

    it('maps practical align-content and place-content into multi-row native output', () => {
        styles.addClass('aligned-wrap', {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            height: '220px',
            alignContent: 'center',
        });
        styles.addClass('distributed-wrap', {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            height: '220px',
            alignContent: 'space-between',
        });
        styles.addClass('around-wrap', {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            height: '220px',
            alignContent: 'space-around',
        });
        styles.addClass('placed-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '40px',
            gap: '12px',
            height: '220px',
            placeContent: 'end',
        });
        styles.addClass('evenly-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '40px',
            gap: '12px',
            height: '220px',
            placeContent: 'space-evenly',
        });
        styles.addClass('single-row-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '40px',
            gap: '12px',
            height: '220px',
            placeContent: 'center',
        });

        const wrapCompose = renderAndroidCompose(
            div(
                { className: 'aligned-wrap' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { functionName: 'AlignContentScreen' },
        );

        const wrapSwiftui = renderSwiftUI(
            div(
                { className: 'aligned-wrap' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { structName: 'AlignContentScreen' },
        );

        const distributedCompose = renderAndroidCompose(
            div(
                { className: 'distributed-wrap' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { functionName: 'SpaceBetweenAlignContentScreen' },
        );

        const distributedSwiftui = renderSwiftUI(
            div(
                { className: 'distributed-wrap' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { structName: 'SpaceBetweenAlignContentScreen' },
        );

        const aroundSwiftui = renderSwiftUI(
            div(
                { className: 'around-wrap' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { structName: 'SpaceAroundAlignContentScreen' },
        );

        const placeCompose = renderAndroidCompose(
            div(
                { className: 'placed-grid' },
                div(span('Alpha')),
                div(span('Beta')),
                div(span('Gamma')),
                div(span('Delta')),
            ),
            { functionName: 'PlaceContentScreen' },
        );

        const placeSwiftui = renderSwiftUI(
            div(
                { className: 'placed-grid' },
                div(span('Alpha')),
                div(span('Beta')),
                div(span('Gamma')),
                div(span('Delta')),
            ),
            { structName: 'PlaceContentScreen' },
        );

        const evenlyCompose = renderAndroidCompose(
            div(
                { className: 'evenly-grid' },
                div(span('Alpha')),
                div(span('Beta')),
                div(span('Gamma')),
                div(span('Delta')),
            ),
            { functionName: 'SpaceEvenlyPlaceContentScreen' },
        );

        const evenlySwiftui = renderSwiftUI(
            div(
                { className: 'evenly-grid' },
                div(span('Alpha')),
                div(span('Beta')),
                div(span('Gamma')),
                div(span('Delta')),
            ),
            { structName: 'SpaceEvenlyPlaceContentScreen' },
        );

        const singleRowCompose = renderAndroidCompose(
            div(
                { className: 'single-row-grid' },
                div(span('Alpha')),
                div(span('Beta')),
            ),
            { functionName: 'SingleRowPlaceContentScreen' },
        );

        const singleRowSwiftui = renderSwiftUI(
            div(
                { className: 'single-row-grid' },
                div(span('Alpha')),
                div(span('Beta')),
            ),
            { structName: 'SingleRowPlaceContentScreen' },
        );

        expect(wrapCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically))');
        expect(wrapSwiftui).toContain('VStack(alignment: .leading, spacing: 0) {');
        expect((wrapSwiftui.match(/Spacer\(minLength: 0\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(wrapSwiftui).toContain('Spacer(minLength: 12)');

        expect(distributedCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.SpaceBetween)');
        expect(distributedSwiftui).toContain('VStack(alignment: .leading, spacing: 0) {');
        expect(distributedSwiftui).toContain('Spacer(minLength: 12)');
        expect(distributedSwiftui).not.toContain('Spacer(minLength: 0)');

        expect((aroundSwiftui.match(/Spacer\(minLength: 6\)/g) ?? []).length).toBeGreaterThanOrEqual(4);

        expect(placeCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.Bottom))');
        expect(placeSwiftui).toContain('Spacer(minLength: 0)');
        expect(placeSwiftui).toContain('.frame(height: 220)');

        expect(evenlyCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.SpaceEvenly)');
        expect((evenlySwiftui.match(/Spacer\(minLength: 12\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
        expect(evenlySwiftui).toContain('.frame(height: 220)');

        expect(singleRowCompose).toContain('Column(modifier = Modifier.height(220.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically))');
        expect(singleRowCompose).toContain('Row(modifier = Modifier.height(40.dp).fillMaxWidth(), horizontalArrangement = Arrangement.Center)');

        expect(singleRowSwiftui).toContain('VStack(alignment: .leading, spacing: 0) {');
        expect((singleRowSwiftui.match(/Spacer\(minLength: 0\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(singleRowSwiftui).toContain('HStack(alignment: .top, spacing: 12) {');
        expect(singleRowSwiftui).toContain('.frame(height: 220)');
    });

    it('maps practical background-image url layers into native output', () => {
        styles.addClass('background-panel', {
            width: '240px',
            height: '140px',
            borderRadius: '24px',
            backgroundImage: 'url("https://elit.dev/hero.png")',
            backgroundSize: 'contain',
            backgroundPosition: 'top right',
            backgroundRepeat: 'repeat',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'background-panel' },
                span('Background image panel'),
            ),
            { functionName: 'BackgroundImageScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'background-panel' },
                span('Background image panel'),
            ),
            { structName: 'BackgroundImageScreen' },
        );

        expect(compose).toContain('ElitBackgroundImage(source = "https://elit.dev/hero.png", backgroundSize = "contain", backgroundPosition = "top-trailing", backgroundRepeat = "repeat", modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)))');
        expect(compose).toContain('Column(modifier = Modifier.width(240.dp).height(140.dp))');

        expect(swiftui).toContain('.background(alignment: .topLeading) {');
        expect(swiftui).toContain('elitBackgroundImageSurface(source: "https://elit.dev/hero.png", backgroundSize: "contain", backgroundPosition: "top-trailing", backgroundRepeat: "repeat")');
        expect(swiftui).toContain('.clipShape(RoundedRectangle(cornerRadius: 24))');
    });

    it('maps practical named grid-template-areas into native output', () => {
        styles.addClass('named-area-grid', {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateAreas: '"summary hero hero" "aside hero hero"',
            gap: '12px',
        });
        styles.addClass('named-area-hero', {
            gridArea: 'hero',
            background: '#f5f1ea',
        });
        styles.addClass('named-area-summary', {
            gridArea: 'summary',
            background: '#e3f1ff',
        });
        styles.addClass('named-area-aside', {
            gridArea: 'aside',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'named-area-grid' },
                div({ className: 'named-area-aside' }, span('Named aside')),
                div({ className: 'named-area-hero' }, span('Named hero')),
                div({ className: 'named-area-summary' }, span('Named summary')),
            ),
            { functionName: 'NamedGridAreaScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'named-area-grid' },
                div({ className: 'named-area-aside' }, span('Named aside')),
                div({ className: 'named-area-hero' }, span('Named hero')),
                div({ className: 'named-area-summary' }, span('Named summary')),
            ),
            { structName: 'NamedGridAreaScreen' },
        );

        expect(compose.indexOf('Text(text = "Named summary")')).toBeLessThan(compose.indexOf('Text(text = "Named hero")'));
        expect(compose.indexOf('Text(text = "Named hero")')).toBeLessThan(compose.indexOf('Text(text = "Named aside")'));
        expect(compose).toContain('Modifier.weight(2f).fillMaxWidth()');

        expect(swiftui.indexOf('Text("Named summary")')).toBeLessThan(swiftui.indexOf('Text("Named hero")'));
        expect(swiftui.indexOf('Text("Named hero")')).toBeLessThan(swiftui.indexOf('Text("Named aside")'));
        expect(swiftui).toContain('.layoutPriority(2)');
    });

    it('maps practical named grid lines into native output', () => {
        styles.addClass('named-line-grid', {
            display: 'grid',
            gridTemplateColumns: '[summary-start] 1fr [card-start hero-start] 1fr [hero-mid] 1fr [card-end hero-end]',
            gridTemplateRows: '[top] auto [middle] auto [bottom]',
            gap: '12px',
        });
        styles.addClass('named-line-hero', {
            gridColumn: 'card-start / card-end',
            gridRow: 'top / bottom',
            background: '#f5f1ea',
        });
        styles.addClass('named-line-summary', {
            gridColumnStart: 'summary-start',
            gridColumnEnd: 'hero-start',
            gridRowStart: 'top',
            gridRowEnd: 'middle',
            background: '#e3f1ff',
        });
        styles.addClass('named-line-aside', {
            gridColumn: 'summary-start / hero-start',
            gridRow: 'middle / bottom',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'named-line-grid' },
                div({ className: 'named-line-aside' }, span('Line aside')),
                div({ className: 'named-line-hero' }, span('Line hero')),
                div({ className: 'named-line-summary' }, span('Line summary')),
            ),
            { functionName: 'NamedGridLineScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'named-line-grid' },
                div({ className: 'named-line-aside' }, span('Line aside')),
                div({ className: 'named-line-hero' }, span('Line hero')),
                div({ className: 'named-line-summary' }, span('Line summary')),
            ),
            { structName: 'NamedGridLineScreen' },
        );

        expect(compose.indexOf('Text(text = "Line summary")')).toBeLessThan(compose.indexOf('Text(text = "Line hero")'));
        expect(compose.indexOf('Text(text = "Line hero")')).toBeLessThan(compose.indexOf('Text(text = "Line aside")'));
        expect(compose).toContain('Modifier.weight(2f).fillMaxWidth()');

        expect(swiftui.indexOf('Text("Line summary")')).toBeLessThan(swiftui.indexOf('Text("Line hero")'));
        expect(swiftui.indexOf('Text("Line hero")')).toBeLessThan(swiftui.indexOf('Text("Line aside")'));
        expect(swiftui).toContain('.layoutPriority(2)');
    });

    it('maps practical repeated named grid-line ordinals into native output', () => {
        styles.addClass('repeated-line-grid', {
            display: 'grid',
            gridTemplateColumns: '[stack] 1fr [stack] 1fr [stack] 1fr [stack]',
            gridTemplateRows: '[band] auto [band] auto [band]',
            gap: '12px',
        });
        styles.addClass('repeated-line-hero', {
            gridColumn: 'stack 2 / 4 stack',
            gridRow: 'band 1 / 3 band',
            background: '#f5f1ea',
        });
        styles.addClass('repeated-line-summary', {
            gridColumnStart: '1 stack',
            gridColumnEnd: 'stack 2',
            gridRowStart: 'band 1',
            gridRowEnd: '2 band',
            background: '#e3f1ff',
        });
        styles.addClass('repeated-line-aside', {
            gridColumn: 'stack 1 / stack 2',
            gridRow: '2 band / band 3',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'repeated-line-grid' },
                div({ className: 'repeated-line-aside' }, span('Ordinal aside')),
                div({ className: 'repeated-line-hero' }, span('Ordinal hero')),
                div({ className: 'repeated-line-summary' }, span('Ordinal summary')),
            ),
            { functionName: 'RepeatedNamedGridLineScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'repeated-line-grid' },
                div({ className: 'repeated-line-aside' }, span('Ordinal aside')),
                div({ className: 'repeated-line-hero' }, span('Ordinal hero')),
                div({ className: 'repeated-line-summary' }, span('Ordinal summary')),
            ),
            { structName: 'RepeatedNamedGridLineScreen' },
        );

        expect(compose.indexOf('Text(text = "Ordinal summary")')).toBeLessThan(compose.indexOf('Text(text = "Ordinal hero")'));
        expect(compose.indexOf('Text(text = "Ordinal hero")')).toBeLessThan(compose.indexOf('Text(text = "Ordinal aside")'));
        expect(compose).toContain('Modifier.weight(2f).fillMaxWidth()');

        expect(swiftui.indexOf('Text("Ordinal summary")')).toBeLessThan(swiftui.indexOf('Text("Ordinal hero")'));
        expect(swiftui.indexOf('Text("Ordinal hero")')).toBeLessThan(swiftui.indexOf('Text("Ordinal aside")'));
        expect(swiftui).toContain('.layoutPriority(2)');
    });

    it('maps practical negative grid line indexes and negative named ordinals into native output', () => {
        styles.addClass('negative-line-grid', {
            display: 'grid',
            gridTemplateColumns: '[slot] 1fr [slot] 1fr [slot] 1fr [slot]',
            gridTemplateRows: '[band] auto [band] auto [band]',
            gap: '12px',
        });
        styles.addClass('negative-line-hero', {
            gridColumn: 'slot -3 / slot -1',
            gridRow: 'band -3 / band -1',
            background: '#f5f1ea',
        });
        styles.addClass('negative-line-summary', {
            gridColumn: '-4 / -3',
            gridRow: '1 / -2',
            background: '#e3f1ff',
        });
        styles.addClass('negative-line-aside', {
            gridColumn: '-4 / -3',
            gridRow: '-2 / -1',
            background: '#fff4e7',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'negative-line-grid' },
                div({ className: 'negative-line-aside' }, span('Negative aside')),
                div({ className: 'negative-line-hero' }, span('Negative hero')),
                div({ className: 'negative-line-summary' }, span('Negative summary')),
            ),
            { functionName: 'NegativeGridLineScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'negative-line-grid' },
                div({ className: 'negative-line-aside' }, span('Negative aside')),
                div({ className: 'negative-line-hero' }, span('Negative hero')),
                div({ className: 'negative-line-summary' }, span('Negative summary')),
            ),
            { structName: 'NegativeGridLineScreen' },
        );

        expect(compose.indexOf('Text(text = "Negative summary")')).toBeLessThan(compose.indexOf('Text(text = "Negative hero")'));
        expect(compose.indexOf('Text(text = "Negative hero")')).toBeLessThan(compose.indexOf('Text(text = "Negative aside")'));
        expect(compose).toContain('Modifier.weight(2f).fillMaxWidth()');

        expect(swiftui.indexOf('Text("Negative summary")')).toBeLessThan(swiftui.indexOf('Text("Negative hero")'));
        expect(swiftui.indexOf('Text("Negative hero")')).toBeLessThan(swiftui.indexOf('Text("Negative aside")'));
        expect(swiftui).toContain('.layoutPriority(2)');
    });

    it('parses practical background shorthand and repeat-x into native output', () => {
        styles.addClass('background-shorthand-panel', {
            width: '240px',
            height: '140px',
            borderRadius: '24px',
            background: 'url("https://elit.dev/pattern.png") left bottom / 100% 100% repeat-x',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'background-shorthand-panel' },
                span('Pattern panel'),
            ),
            { functionName: 'BackgroundShorthandScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'background-shorthand-panel' },
                span('Pattern panel'),
            ),
            { structName: 'BackgroundShorthandScreen' },
        );

        expect(compose).toContain('ElitBackgroundImage(source = "https://elit.dev/pattern.png", backgroundSize = "fill", backgroundPosition = "bottom-leading", backgroundRepeat = "repeat-x", modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)))');
        expect(compose).toContain('if (repeatMode == "repeat-y") android.graphics.Shader.TileMode.CLAMP else android.graphics.Shader.TileMode.REPEAT');
        expect(compose).toContain('if (repeatMode == "repeat-x") android.graphics.Shader.TileMode.CLAMP else android.graphics.Shader.TileMode.REPEAT');

        expect(swiftui).toContain('elitBackgroundImageSurface(source: "https://elit.dev/pattern.png", backgroundSize: "fill", backgroundPosition: "bottom-leading", backgroundRepeat: "repeat-x")');
    });

    it('maps practical multiple background shorthand layers into native output', () => {
        styles.addClass('background-layer-panel', {
            width: '240px',
            height: '140px',
            borderRadius: '24px',
            background: 'url("https://elit.dev/overlay.png") top right / contain no-repeat, url("https://elit.dev/base.png") left bottom / auto auto repeat-y',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'background-layer-panel' },
                span('Layered panel'),
            ),
            { functionName: 'BackgroundLayerScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'background-layer-panel' },
                span('Layered panel'),
            ),
            { structName: 'BackgroundLayerScreen' },
        );

        const composeBaseIndex = compose.indexOf('ElitBackgroundImage(source = "https://elit.dev/base.png", backgroundSize = "none", backgroundPosition = "bottom-leading", backgroundRepeat = "repeat-y", modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)))');
        const composeOverlayIndex = compose.indexOf('ElitBackgroundImage(source = "https://elit.dev/overlay.png", backgroundSize = "contain", backgroundPosition = "top-trailing", modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)))');
        expect(compose).toContain('Box {');
        expect(composeBaseIndex).toBeGreaterThanOrEqual(0);
        expect(composeOverlayIndex).toBeGreaterThanOrEqual(0);
        expect(composeBaseIndex).toBeLessThan(composeOverlayIndex);

        expect(swiftui).toContain('.background(alignment: .topLeading) {');
        expect(swiftui).toContain('ZStack {');
        const swiftBaseIndex = swiftui.indexOf('elitBackgroundImageSurface(source: "https://elit.dev/base.png", backgroundSize: "none", backgroundPosition: "bottom-leading", backgroundRepeat: "repeat-y")');
        const swiftOverlayIndex = swiftui.indexOf('elitBackgroundImageSurface(source: "https://elit.dev/overlay.png", backgroundSize: "contain", backgroundPosition: "top-trailing")');
        expect(swiftBaseIndex).toBeGreaterThanOrEqual(0);
        expect(swiftOverlayIndex).toBeGreaterThanOrEqual(0);
        expect(swiftBaseIndex).toBeLessThan(swiftOverlayIndex);
    });

    it('maps practical mixed gradient, image, and color background layers into native output', () => {
        styles.addClass('background-mixed-panel', {
            width: '240px',
            height: '140px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.12)), url("https://elit.dev/base.png") center / cover no-repeat #102030',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'background-mixed-panel' },
                span('Mixed panel'),
            ),
            { functionName: 'BackgroundMixedScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'background-mixed-panel' },
                span('Mixed panel'),
            ),
            { structName: 'BackgroundMixedScreen' },
        );

        const composeColorIndex = compose.indexOf('Box(modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)).background(Color(');
        const composeImageIndex = compose.indexOf('ElitBackgroundImage(source = "https://elit.dev/base.png", modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)))');
        const composeGradientIndex = compose.indexOf('Box(modifier = Modifier.matchParentSize().clip(RoundedCornerShape(24.dp)).background(brush = Brush.verticalGradient(');
        expect(composeColorIndex).toBeGreaterThanOrEqual(0);
        expect(composeImageIndex).toBeGreaterThanOrEqual(0);
        expect(composeGradientIndex).toBeGreaterThanOrEqual(0);
        expect(composeColorIndex).toBeLessThan(composeImageIndex);
        expect(composeImageIndex).toBeLessThan(composeGradientIndex);
        expect(compose.match(/Brush\.verticalGradient\(colors = listOf\(/g)?.length ?? 0).toBe(1);

        expect(swiftui).toContain('.background(alignment: .topLeading) {');
        expect(swiftui).toContain('ZStack {');
        const swiftColorIndex = swiftui.indexOf('Rectangle().fill(Color(');
        const swiftImageIndex = swiftui.indexOf('elitBackgroundImageSurface(source: "https://elit.dev/base.png")');
        const swiftGradientIndex = swiftui.indexOf('Rectangle().fill(LinearGradient(colors: [');
        expect(swiftColorIndex).toBeGreaterThanOrEqual(0);
        expect(swiftImageIndex).toBeGreaterThanOrEqual(0);
        expect(swiftGradientIndex).toBeGreaterThanOrEqual(0);
        expect(swiftColorIndex).toBeLessThan(swiftImageIndex);
        expect(swiftImageIndex).toBeLessThan(swiftGradientIndex);
        expect(swiftui.match(/LinearGradient\(colors: \[/g)?.length ?? 0).toBe(1);
    });

    it('wraps flex rows into stacked native rows when content exceeds the mobile viewport', () => {
        styles.addClass('button-row', {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'button-row' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { functionName: 'WrappedButtonsScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'button-row' },
                button('Record another validation pass'),
                button('Open the Elit repository'),
            ),
            { structName: 'WrappedButtonsScreen' },
        );

        expect(compose).toContain('Column(modifier = Modifier, verticalArrangement = Arrangement.spacedBy(12.dp))');
        expect(compose).toContain('Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))');

        expect(swiftui).toContain('VStack(alignment: .leading, spacing: 12) {');
        expect(swiftui).toContain('HStack(alignment: .top, spacing: 12) {');
    });

    it('translates safe text margins into native spacing', () => {
        styles.addTag('h2', {
            marginBottom: '14px',
            color: '#261914',
        });

        const compose = renderAndroidCompose(
            div(
                h2('Section title'),
                span('Body copy'),
            ),
            { functionName: 'MarginScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                h2('Section title'),
                span('Body copy'),
            ),
            { structName: 'MarginScreen' },
        );

        expect(compose).toContain('Text(text = "Section title", modifier = Modifier.padding(bottom = 14.dp), color = Color(');
        expect(swiftui).toContain('Text("Section title")');
        expect(swiftui).toContain('.padding(.bottom, 14)');
    });

    it('centers max-width containers with horizontal auto margins', () => {
        styles.addClass('shell', {
            maxWidth: '480px',
            margin: '0 auto',
            gap: '16px',
        });

        const compose = renderAndroidCompose(
            div(
                { className: 'shell' },
                span('Centered shell'),
            ),
            { functionName: 'CenteredShellScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                { className: 'shell' },
                span('Centered shell'),
            ),
            { structName: 'CenteredShellScreen' },
        );

        expect(compose).toContain('Modifier.fillMaxWidth().widthIn(max = 480.dp).wrapContentWidth(Alignment.CenterHorizontally)');
        expect(swiftui).toContain('.frame(maxWidth: 480)');
        expect(swiftui).toContain('.frame(maxWidth: .infinity, alignment: .center)');
    });

    it('keeps decorated element margins as outer native spacing', () => {
        styles.addClass('pill', {
            display: 'inline-block',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(213, 110, 67, 0.12)',
            color: '#d56e43',
            marginBottom: '10px',
        });

        const compose = renderAndroidCompose(
            div(
                span({ className: 'pill' }, 'Web'),
                span('Body copy'),
            ),
            { functionName: 'DecoratedMarginScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                span({ className: 'pill' }, 'Web'),
                span('Body copy'),
            ),
            { structName: 'DecoratedMarginScreen' },
        );

        expect(compose).toContain('Modifier.padding(bottom = 10.dp).background(color = Color(');
        expect(compose).toContain('RoundedCornerShape(999.dp)).padding(top = 6.dp, end = 10.dp, bottom = 6.dp, start = 10.dp)');
        expect(swiftui).toContain('.background(Color(');
        expect(swiftui).toContain('.padding(.bottom, 10)');
    });

    it('neutralizes native text field chrome and adds multiline textarea hints', () => {
        styles.addClass('field', {
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(38, 25, 20, 0.12)',
            background: '#fff',
            color: '#261914',
            fontWeight: 700,
        });

        const compose = renderAndroidCompose(
            div(
                input({ className: 'field', value: 'abc', placeholder: 'Search' }),
                textarea({ className: 'field', value: 'Notes', placeholder: 'Repo note' }),
            ),
            { functionName: 'FieldChromeScreen' },
        );

        const swiftui = renderSwiftUI(
            div(
                input({ className: 'field', value: 'abc', placeholder: 'Search' }),
                textarea({ className: 'field', value: 'Notes', placeholder: 'Repo note' }),
            ),
            { structName: 'FieldChromeScreen' },
        );

        expect(compose).toContain('BasicTextField(');
        expect(compose).toContain('textStyle = androidx.compose.ui.text.TextStyle(');
        expect(compose).toContain('cursorBrush = SolidColor(Color(');
        expect(compose).toContain('modifier = Modifier.background(color = Color(red = 1f, green = 1f, blue = 1f, alpha = 1f), shape = RoundedCornerShape(16.dp)).border(1.dp, Color(red = 0.149f, green = 0.098f, blue = 0.078f, alpha = 0.12f), RoundedCornerShape(16.dp)).padding(top = 14.dp, end = 16.dp, bottom = 14.dp, start = 16.dp)');
        expect(compose).toContain('singleLine = true,');
        expect(compose).toContain('decorationBox = { innerTextField ->');
        expect(compose).toContain('minLines = 4,');
        expect(compose).toContain('contentAlignment = Alignment.TopStart');

        expect(swiftui).toContain('.textFieldStyle(.plain)');
        expect(swiftui).toContain('TextField("Repo note", text: $textFieldValue1, axis: .vertical)');
        expect(swiftui).toContain('.lineLimit(4, reservesSpace: true)');
    });

    it('maps gradients, shadows, and button theme into Compose output', () => {
        const compose = renderAndroidCompose(
            div(
                {
                    style: {
                        background: 'linear-gradient(180deg, #f7e7d2 0%, #f0d7ba 100%)',
                        borderRadius: '28px',
                        boxShadow: '0 24px 80px rgba(102, 61, 35, 0.12)',
                        padding: '24px',
                    },
                },
                button(
                    {
                        style: {
                            background: 'linear-gradient(135deg, #d56e43 0%, #b75a36 100%)',
                            color: '#fff6ee',
                            borderRadius: '999px',
                            boxShadow: '0 10px 28px rgba(102, 61, 35, 0.15)',
                            fontWeight: '700',
                        },
                    },
                    'Launch now',
                ),
            ),
            { functionName: 'ThemedScreen' },
        );

        expect(compose).toContain('background(brush = Brush.verticalGradient(colors = listOf(');
        expect(compose).toContain('shadow(elevation = 24.dp, shape = RoundedCornerShape(28.dp))');
        expect(compose).toContain('Box(modifier = Modifier.shadow(elevation = 10.dp, shape = RoundedCornerShape(999.dp)).background(brush = Brush.linearGradient(colors = listOf(');
        expect(compose).toContain('contentAlignment = Alignment.Center');
        expect(compose).toContain('Text(text = "Launch now", color = Color(');
        expect(compose).toContain('fontWeight = FontWeight.W700');
    });

    it('maps gradients, shadows, and button theme into SwiftUI output', () => {
        const swiftui = renderSwiftUI(
            div(
                {
                    style: {
                        background: 'linear-gradient(180deg, #f7e7d2 0%, #f0d7ba 100%)',
                        borderRadius: '28px',
                        boxShadow: '0 24px 80px rgba(102, 61, 35, 0.12)',
                        padding: '24px',
                    },
                },
                button(
                    {
                        style: {
                            background: 'linear-gradient(135deg, #d56e43 0%, #b75a36 100%)',
                            color: '#fff6ee',
                            borderRadius: '999px',
                            boxShadow: '0 10px 28px rgba(102, 61, 35, 0.15)',
                            fontWeight: '700',
                        },
                    },
                    'Launch now',
                ),
            ),
            { structName: 'ThemedScreen' },
        );

        expect(swiftui).toContain('.background(LinearGradient(colors: [Color(');
        expect(swiftui).toContain('.clipShape(RoundedRectangle(cornerRadius: 28))');
        expect(swiftui).toContain('.shadow(color: Color(');
        expect(swiftui).toContain('Text("Launch now")');
        expect(swiftui).toContain('.buttonStyle(.plain)');
        expect(swiftui).toContain('.clipShape(RoundedRectangle(cornerRadius: 999))');
        expect(swiftui).toContain('.font(.system(size: 17, weight: .bold))');
        expect(swiftui).toContain('.foregroundStyle(Color(');
    });
});