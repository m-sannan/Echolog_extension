document.addEventListener('DOMContentLoaded', () => {
    const domainList = document.getElementById('domainList');
    const emptyState = document.getElementById('emptyState');
    const domainInput = document.getElementById('domainInput');
    const domainForm = document.getElementById('addDomainForm');
    const finishBtn = document.getElementById('finishBtn');
    const skipBtn = document.getElementById('skipBtn');
    
    let domains = [];

    function updateList() {
        if (domains.length === 0) {
            emptyState.style.display = 'block';
            finishBtn.classList.add('opacity-50', 'pointer-events-none');
        } else {
            emptyState.style.display = 'none';
            finishBtn.classList.remove('opacity-50', 'pointer-events-none');
        }
        
        const existingItems = domainList.querySelectorAll('.domain-item');
        existingItems.forEach(el => el.remove());

        domains.forEach((d, index) => {
            const div = document.createElement('div');
            div.className = 'domain-item flex items-center justify-between bg-white border border-gray-200 p-3.5 rounded-lg group hover:border-gray-300 transition-colors';
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-gray-400 text-[18px]">captive_portal</span>
                    <span class="font-mono text-gray-700 text-[13px]">${d}</span>
                </div>
                <button data-index="${index}" class="remove-btn material-symbols-outlined text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md hover:bg-red-50 text-[18px]">close</button>
            `;
            domainList.appendChild(div);
        });

        // Attach event listeners to newly created remove buttons
        const removeBtns = domainList.querySelectorAll('.remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                removeDomain(idx);
            });
        });
    }

    function addDomain(name) {
        if (name && !domains.includes(name)) {
            let parsedName = name;
            try { 
                parsedName = name.startsWith('http') ? new URL(name).host : name.replace(/\/$/, '');
            } catch(e) {}
            
            domains.push(parsedName);
            updateList();
        }
        domainInput.value = '';
        domainInput.focus();
    }

    function removeDomain(index) {
        domains.splice(index, 1);
        updateList();
    }

    domainForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addDomain(domainInput.value.trim());
    });

    // Attach click listeners for suggested domains
    const suggestedBtns = document.querySelectorAll('.suggested-domain');
    suggestedBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            addDomain(e.target.innerText.trim());
        });
    });

    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            window.close();
        });
    }

    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            finishBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">sync</span> Finalizing...';
            finishBtn.classList.add('opacity-80', 'pointer-events-none');
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('allowedDomains', (result) => {
                    const currentDomains = result.allowedDomains || [];
                    const finalDomains = [...new Set([...currentDomains, ...domains])];
                    
                    chrome.storage.local.set({ allowedDomains: finalDomains }, () => {
                        setTimeout(() => {
                            alert('Environment ready! You can now use EchoLog.');
                            window.close();
                        }, 800);
                    });
                });
            } else {
                setTimeout(() => {
                    alert('Environment ready! (Storage API not found, assuming local dev)');
                    window.close();
                }, 800);
            }
        });
    }
});
