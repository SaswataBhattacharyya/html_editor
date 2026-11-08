import fs from 'node:fs/promises';
import path from 'node:path';

export function safeLabel(value) {
    const text = String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim();
    return text.slice(0, 70) || 'Unnamed screen';
}

function decodeEntities(value) {
    return String(value || '').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function parseHierarchy(xml) {
    const results = [];
    const nodeRegex = /<node\b([^>]*)\/?>/g;
    let match;
    while ((match = nodeRegex.exec(String(xml || ''))) && results.length < 800) {
        const attributes = {};
        for (const attr of match[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[attr[1]] = decodeEntities(attr[2]);
        const className = attributes.class || '';
        const resourceId = attributes['resource-id'] || '';
        const sensitive = /password|email|phone|account|otp|token|secret|pin|credit|billing/i.test(resourceId)
            || /EditText|Password/i.test(className) || attributes.password === 'true';
        results.push({
            className: className.slice(0, 100),
            resourceId: resourceId.slice(0, 180),
            text: sensitive ? '' : (attributes.text || '').slice(0, 90),
            description: sensitive ? '' : (attributes['content-desc'] || '').slice(0, 90),
            clickable: attributes.clickable === 'true',
            scrollable: attributes.scrollable === 'true',
            bounds: (attributes.bounds || '').slice(0, 60)
        });
    }
    return results;
}

export function buildScreenSpec(captures, name) {
    const screens = (captures || []).map((capture, index) => {
        const candidates = (capture.nodes || []).filter(node =>
            node.clickable && (node.text || node.description) &&
            !/password|sign out|delete|purchase|subscribe|payment/i.test((node.text || '') + ' ' + (node.description || ''))
        );
        const buttons = [...new Set(candidates.map(node => safeLabel(node.text || node.description)))]
            .slice(0, 16);
        return {
            id: 'screen-' + (index + 1),
            title: safeLabel(capture.label || 'Screen ' + (index + 1)),
            screenshot: capture.screenshot,
            capturedAt: capture.createdAt,
            elements: candidates.slice(0, 50),
            buttons
        };
    });
    return { version: 1, appName: safeLabel(name || 'Mobile Reference'), screens,
        note: 'Observed UI metadata only. No claim of original source code, API behavior or exact visual fidelity.' };
}

const starterApp = [
    "import React, { useState } from 'react';",
    "import { SafeAreaView, View, Text, ScrollView, Pressable, StyleSheet, StatusBar } from 'react-native';",
    '',
    'const spec = __SPEC__;',
    '',
    'export default function App() {',
    "  const [active, setActive] = useState(spec.screens[0]?.id || '');",
    '  const screen = spec.screens.find(item => item.id === active) || spec.screens[0];',
    '  return (',
    '    <SafeAreaView style={styles.root}>',
    '      <StatusBar barStyle="light-content" />',
    '      <View style={styles.header}><Text style={styles.brand}>{spec.appName}</Text></View>',
    '      <ScrollView contentContainerStyle={styles.content}>',
    '        <Text style={styles.h1}>{screen?.title || "No screens captured"}</Text>',
    '        <Text style={styles.explainer}>Editable starter generated from observed screens. Wire up app logic, data and navigation before release.</Text>',
    '        {(screen?.buttons || []).map((label, index) => (',
    '          <View style={styles.action} key={index}><Text style={styles.actionText}>{label}</Text></View>',
    '        ))}',
    '      </ScrollView>',
    '      <ScrollView horizontal style={styles.tabs} contentContainerStyle={styles.tabsContent}>',
    '        {spec.screens.map(item => <Pressable key={item.id} onPress={() => setActive(item.id)}',
    '          style={[styles.tab, active === item.id && styles.tabActive]}>',
    '          <Text style={styles.tabText}>{item.title}</Text></Pressable>)}',
    '      </ScrollView>',
    '    </SafeAreaView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  root: { flex: 1, backgroundColor: "#0e1523" },',
    '  header: { padding: 18, backgroundColor: "#182237" },',
    '  brand: { fontSize: 16, fontWeight: "700", color: "#ffffff" },',
    '  content: { padding: 22, gap: 12, minHeight: 340 },',
    '  h1: { fontSize: 27, fontWeight: "700", color: "#ffffff" },',
    '  explainer: { fontSize: 13, lineHeight: 20, color: "#a3b3cb", marginBottom: 12 },',
    '  action: { padding: 15, backgroundColor: "#233149", borderRadius: 10 },',
    '  actionText: { color: "#e7eef7", fontSize: 15 },',
    '  tabs: { maxHeight: 72, borderTopWidth: 1, borderColor: "#35425b" },',
    '  tabsContent: { padding: 10, gap: 8 },',
    '  tab: { borderRadius: 9, backgroundColor: "#223047", padding: 11 },',
    '  tabActive: { backgroundColor: "#2563eb" },',
    '  tabText: { color: "#ffffff", fontSize: 12 }',
    '});',
    ''
].join('\n');

export async function generateStarter(projectDir, spec) {
    if (!spec.screens.length) throw new Error('Capture at least one screen before generating a starter.');
    const outputDir = path.join(projectDir, 'mobile', 'generated', 'expo-starter');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'App.js'), starterApp.replace('__SPEC__', JSON.stringify(spec, null, 2)));
    await fs.writeFile(path.join(outputDir, 'screens.json'), JSON.stringify(spec, null, 2) + '\n');
    await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify({
        name: 'mobile-reference-starter', version: '0.1.0', private: true, main: 'node_modules/expo/AppEntry.js',
        scripts: { start: 'expo start', android: 'expo run:android', 'check': 'expo-doctor' },
        dependencies: { expo: '~54.0.0', react: '19.1.0', 'react-native': '0.81.4' }
    }, null, 2) + '\n');
    await fs.writeFile(path.join(outputDir, 'app.json'), JSON.stringify({
        expo: { name: spec.appName, slug: 'mobile-reference-starter', version: '0.1.0',
            orientation: 'portrait', userInterfaceStyle: 'dark', android: { package: 'com.example.mobilereferencestarter' } }
    }, null, 2) + '\n');
    await fs.writeFile(path.join(outputDir, 'README.md'),
        '# Mobile app reconstruction starter\n\nThis is a **new, non-identical** Expo screen/navigation starter grounded in captured UI metadata. It is NOT a recovered APK source tree or feature-complete clone.\n\n'
        + 'Run npm install, npx expo install --fix, and npx expo start --android after configuring Android locally. '
        + 'Implement your own data storage, authentication and feature logic. Screenshots are retained outside this output in the project mobile/captures folder for visual reference.\n');
    return outputDir;
}
