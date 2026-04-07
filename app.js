// app.js - Logic for Word to Markdown Converter

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadSection = document.getElementById('upload-section');
    const loadingState = document.getElementById('loading-state');
    const errorMsg = document.getElementById('error-message');
    
    const resultSection = document.getElementById('result-section');
    const mdPreview = document.getElementById('markdown-preview');
    const fileNameDisplay = document.getElementById('file-name-display');
    
    const downloadBtn = document.getElementById('download-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const copyBtn = document.getElementById('copy-btn');

    let currentFileName = 'document';

    // --- Drag and Drop Handlers --- //
    
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    // --- Processing Logic --- //

    async function handleFile(file) {
        errorMsg.textContent = "";
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.docx')) {
            errorMsg.textContent = "Please upload a valid Word document (.docx)";
            return;
        }

        // Save name for download
        currentFileName = file.name.replace(/\.docx$/i, '');
        fileNameDisplay.textContent = file.name;

        // UI State: Hide upload, show loading
        dropZone.classList.add('hidden');
        loadingState.classList.remove('hidden');

        // Reading file and using mammoth
        const reader = new FileReader();

        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            // Options to completely ignore images in Mammoth conversion
            const options = {
                arrayBuffer: arrayBuffer,
                convertImage: mammoth.images.inline(function(element) {
                    return Promise.resolve([]);
                })
            };

            // Convert to Markdown
            mammoth.convertToMarkdown(options)
                .then(displayResult)
                .catch(handleError);
        };

        reader.onerror = function(e) {
            handleError("Error reading the file.");
        };

        reader.readAsArrayBuffer(file);
    }

    function displayResult(result) {
        // Strip out any trailing reference links (e.g. [1]: data:image/png;base64,...)
        // by aggressive line filtering and regex
        let cleanMarkdown = result.value;
        
        // Remove any line containing a base64 image (this perfectly catches [1]: data:image...)
        cleanMarkdown = cleanMarkdown.split('\n').filter(line => !line.includes('data:image')).join('\n');
        
        // Also remove inline markdown image markup just in case `![alt](data:image...)`
        cleanMarkdown = cleanMarkdown.replace(/!\[.*?\]\(.*?\)/g, '');
        // Remove rogue image references like ![][1]
        cleanMarkdown = cleanMarkdown.replace(/!\[.*?\]\[\d+\]/g, '');
            
        // Output result to preview
        mdPreview.value = cleanMarkdown.trim(); 
        
        // Check for mappings warnings
        if (result.messages && result.messages.length > 0) {
            console.warn("Mammoth Warnings:", result.messages);
        }

        // UI State: hide upload section, show result section
        uploadSection.classList.add('hidden');
        uploadSection.classList.remove('active');
        
        // Reset upload UI state silently for when user comes back
        dropZone.classList.remove('hidden');
        loadingState.classList.add('hidden');
        fileInput.value = ''; 
        
        resultSection.classList.remove('hidden');
        resultSection.classList.add('active');
    }

    function handleError(err) {
        console.error('Conversion Error:', err);
        let errorMessage = typeof err === 'string' ? err : (err.message || 'An unknown error occurred.');
        errorMsg.textContent = "Error processing file: " + errorMessage;
        
        // Reset UI State to allow another upload
        dropZone.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }

    // --- Actions --- //

    // Download Button
    downloadBtn.addEventListener('click', () => {
        const mdContent = mdPreview.value;
        if (!mdContent) return;

        const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFileName}.md`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(mdPreview.value);
            
            // Visual feedback
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            prompt('Press Ctrl/Cmd+C to copy', mdPreview.value);
        }
    });

    // Start Over
    startOverBtn.addEventListener('click', () => {
        errorMsg.textContent = '';
        mdPreview.value = '';
        
        resultSection.classList.add('hidden');
        resultSection.classList.remove('active');
        
        uploadSection.classList.remove('hidden');
        uploadSection.classList.add('active');
    });
});
