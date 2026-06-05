/** Tab switching on audit card — epic H4. */
import { runtimeBridge } from './runtime-bridge.js';

function switchTab(tabName) {
    const tabBtnMap = {
        data: 'tabDataBtn',
        results: 'tabResultsBtn',
        report: 'tabReportBtn',
        chat: 'tabChatBtn',
    };
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const btn = document.getElementById(tabBtnMap[tabName]) || document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (btn && !btn.disabled) btn.classList.add('active');

    const content = document.getElementById(`tab-${tabName}`);
    if (content) content.classList.add('active');
    if (tabName === 'results') {
        runtimeBridge.loadKbStatusCard?.();
    }
    if (tabName === 'chat') {
        runtimeBridge.renderChatHistory?.();
    }
    if (tabName === 'report') {
        runtimeBridge.loadComparison?.();
        setTimeout(async () => {
            try { await mermaid.run({ querySelector: '.mermaid' }); } catch (err) { console.error(err); }
        }, 200);
    }
    if (tabName === 'schemes' || (tabName === 'report' && document.querySelector('#schemesContainer .mermaid'))) {
        setTimeout(async () => {
            try {
                await mermaid.run({ querySelector: '.mermaid' });
            } catch (err) {
                console.error('Mermaid re-render error:', err);
            }
        }, 200);
    }
}

export { switchTab };
