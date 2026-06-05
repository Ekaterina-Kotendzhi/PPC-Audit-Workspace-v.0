/** Drag-and-drop file zones — epic H4. */

function setupDropZones() {
    document.querySelectorAll('.drop-zone').forEach(zone => {
        const targetId = zone.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            const dt = new DataTransfer();
            dt.items.add(e.dataTransfer.files[0]);
            input.files = dt.files;
            zone.querySelector('.drop-zone-title').textContent = `Выбран файл: ${e.dataTransfer.files[0].name}`;
            input.dispatchEvent(new Event('change'));
        });
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
                const title = zone.querySelector('.drop-zone-title');
                if (title) title.textContent = `Выбран файл: ${input.files[0].name}`;
            }
        });
    });
}

export { setupDropZones };
