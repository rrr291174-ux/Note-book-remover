// TET DSC Tech Squad - Watermark Remover Pro
// Main Application JavaScript

// Global variables
let uploadedImages = [];
let currentImageIndex = 0;
let logoImage = null;
let watermarkSettings = {
    text: 'TGDSCGROUP',
    bgColor: '#FFD400',
    textColor: '#000000',
    size: 22,
    offsetX: 20,
    offsetY: 20,
    showBanner: true,
    showButton: true,
    imagesPerPage: 2
};

// Telegram link
const TELEGRAM_LINK = 'https://t.me/tgdsc2025';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved settings if any
    loadSettings();
}

function setupEventListeners() {
    // File input
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const logoInput = document.getElementById('logoInput');
    
    // File selection
    fileInput.addEventListener('change', handleFileSelect);
    logoInput.addEventListener('change', handleLogoSelect);
    
    // Drag and drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Logo upload area
    const logoUploadArea = document.querySelector('#logoUploadArea > div:first-child');
    logoUploadArea.addEventListener('click', () => logoInput.click());
    
    // Settings controls
    document.getElementById('watermarkText').addEventListener('input', updateWatermarkText);
    document.getElementById('bgColor').addEventListener('input', updateBgColor);
    document.getElementById('bgColorText').addEventListener('input', updateBgColorText);
    document.getElementById('textColor').addEventListener('input', updateTextColor);
    document.getElementById('textColorText').addEventListener('input', updateTextColorText);
    document.getElementById('watermarkSize').addEventListener('input', updateWatermarkSize);
    document.getElementById('offsetX').addEventListener('input', updateOffsetX);
    document.getElementById('offsetY').addEventListener('input', updateOffsetY);
    document.getElementById('showBanner').addEventListener('change', updateShowBanner);
    document.getElementById('showButton').addEventListener('change', updateShowButton);
    document.getElementById('imagesPerPage').addEventListener('change', updateImagesPerPage);
}

function handleFileSelect(event) {
    const files = event.target.files;
    processFiles(files);
}

function handleLogoSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            logoImage = new Image();
            logoImage.onload = function() {
                showLogoPreview(e.target.result);
                redrawCanvas();
            };
            logoImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function showLogoPreview(src) {
    const logoPreview = document.getElementById('logoPreview');
    const logoImageElement = document.getElementById('logoImage');
    const uploadArea = document.querySelector('#logoUploadArea > div:first-child');
    
    logoImageElement.src = src;
    logoPreview.classList.remove('hidden');
    uploadArea.classList.add('hidden');
}

function removeLogo() {
    logoImage = null;
    const logoPreview = document.getElementById('logoPreview');
    const uploadArea = document.querySelector('#logoUploadArea > div:first-child');
    
    logoPreview.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    document.getElementById('logoInput').value = '';
    redrawCanvas();
}

function processFiles(files) {
    uploadedImages = [];
    const imagePromises = Array.from(files).filter(file => 
        file.type.startsWith('image/')
    ).map((file, index) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    uploadedImages.push({
                        id: `img-${Date.now()}-${index}`,
                        name: file.name,
                        src: e.target.result,
                        width: img.width,
                        height: img.height
                    });
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(imagePromises).then(() => {
        if (uploadedImages.length > 0) {
            showEditor();
            currentImageIndex = 0;
            updateNavigation();
            redrawCanvas();
        }
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    const files = event.dataTransfer.files;
    processFiles(files);
}

function showEditor() {
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('editorSection').classList.remove('hidden');
}

function hideEditor() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('editorSection').classList.add('hidden');
}

function updateNavigation() {
    document.getElementById('currentImageIndex').textContent = currentImageIndex + 1;
    document.getElementById('totalImages').textContent = uploadedImages.length;
}

function previousImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateNavigation();
        redrawCanvas();
    }
}

function nextImage() {
    if (currentImageIndex < uploadedImages.length - 1) {
        currentImageIndex++;
        updateNavigation();
        redrawCanvas();
    }
}

function redrawCanvas() {
    if (uploadedImages.length === 0) return;
    
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const currentImage = uploadedImages[currentImageIndex];
    
    // Create image object
    const img = new Image();
    img.onload = function() {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Draw logo if available
        if (logoImage && watermarkSettings.showLogo) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            const logoSize = 80;
            ctx.drawImage(logoImage, canvas.width - logoSize - 20, 20, logoSize, logoSize);
            ctx.restore();
        }
        
        // Draw watermark
        drawWatermark(ctx, canvas.width, canvas.height);
        
        // Update watermark overlay position
        updateWatermarkOverlay(canvas.width, canvas.height);
    };
    img.src = currentImage.src;
}

function drawWatermark(ctx, canvasWidth, canvasHeight) {
    const bannerHeight = canvasHeight * (watermarkSettings.size / 100);
    const bannerWidth = canvasWidth * 0.22;
    const x = canvasWidth - bannerWidth - watermarkSettings.offsetX;
    const y = canvasHeight - bannerHeight - watermarkSettings.offsetY;
    
    // Draw background
    ctx.fillStyle = watermarkSettings.bgColor;
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + bannerWidth - radius, y);
    ctx.quadraticCurveTo(x + bannerWidth, y, x + bannerWidth, y + radius);
    ctx.lineTo(x + bannerWidth, y + bannerHeight - radius);
    ctx.quadraticCurveTo(x + bannerWidth, y + bannerHeight, x + bannerWidth - radius, y + bannerHeight);
    ctx.lineTo(x + radius, y + bannerHeight);
    ctx.quadraticCurveTo(x, y + bannerHeight, x, y + bannerHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    // Draw text
    const fontSize = bannerHeight * 0.55;
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = watermarkSettings.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText(watermarkSettings.text, x + bannerWidth / 2, y + bannerHeight / 2);
    
    // Add underline for clickable indication
    const textWidth = ctx.measureText(watermarkSettings.text).width;
    const textX = x + bannerWidth / 2;
    const textY = y + bannerHeight / 2;
    
    ctx.beginPath();
    ctx.moveTo(textX - textWidth / 2, textY + fontSize / 2 + 4);
    ctx.lineTo(textX + textWidth / 2, textY + fontSize / 2 + 4);
    ctx.strokeStyle = watermarkSettings.textColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateWatermarkOverlay(canvasWidth, canvasHeight) {
    const overlay = document.getElementById('watermarkOverlay');
    const bannerHeight = canvasHeight * (watermarkSettings.size / 100);
    const bannerWidth = canvasWidth * 0.22;
    const x = canvasWidth - bannerWidth - watermarkSettings.offsetX;
    const y = canvasHeight - bannerHeight - watermarkSettings.offsetY;
    
    // Position overlay over watermark
    overlay.style.left = `${x}px`;
    overlay.style.top = `${y}px`;
    overlay.style.width = `${bannerWidth}px`;
    overlay.style.height = `${bannerHeight}px`;
    overlay.classList.remove('hidden');
}

// Settings update functions
function updateWatermarkText(event) {
    watermarkSettings.text = event.target.value;
    redrawCanvas();
}

function updateBgColor(event) {
    watermarkSettings.bgColor = event.target.value;
    document.getElementById('bgColorText').value = event.target.value;
    redrawCanvas();
}

function updateBgColorText(event) {
    watermarkSettings.bgColor = event.target.value;
    document.getElementById('bgColor').value = event.target.value;
    redrawCanvas();
}

function updateTextColor(event) {
    watermarkSettings.textColor = event.target.value;
    document.getElementById('textColorText').value = event.target.value;
    redrawCanvas();
}

function updateTextColorText(event) {
    watermarkSettings.textColor = event.target.value;
    document.getElementById('textColor').value = event.target.value;
    redrawCanvas();
}

function updateWatermarkSize(event) {
    watermarkSettings.size = event.target.value;
    document.getElementById('sizeValue').textContent = event.target.value;
    redrawCanvas();
}

function updateOffsetX(event) {
    watermarkSettings.offsetX = event.target.value;
    document.getElementById('offsetXValue').textContent = event.target.value;
    redrawCanvas();
}

function updateOffsetY(event) {
    watermarkSettings.offsetY = event.target.value;
    document.getElementById('offsetYValue').textContent = event.target.value;
    redrawCanvas();
}

function updateShowBanner(event) {
    watermarkSettings.showBanner = event.target.checked;
}

function updateShowButton(event) {
    watermarkSettings.showButton = event.target.checked;
}

function updateImagesPerPage(event) {
    watermarkSettings.imagesPerPage = parseInt(event.target.value);
}

// Download functions
function downloadAll() {
    showLoading();
    
    uploadedImages.forEach((image, index) => {
        setTimeout(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw and watermark
                ctx.drawImage(img, 0, 0);
                
                if (logoImage) {
                    ctx.save();
                    ctx.globalAlpha = 0.9;
                    ctx.drawImage(logoImage, canvas.width - 100, 20, 80, 80);
                    ctx.restore();
                }
                
                drawWatermark(ctx, canvas.width, canvas.height);
                
                // Download
                const link = document.createElement('a');
                link.download = `watermarked-${image.name}`;
                link.href = canvas.toDataURL();
                link.click();
                
                if (index === uploadedImages.length - 1) {
                    hideLoading();
                }
            };
            
            img.src = image.src;
        }, index * 200);
    });
}

function downloadPDF() {
    showLoading();
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4"
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const topBannerHeight = 60;
    const joinButtonHeight = 40;
    const bottomMargin = 20;
    
    const contentTop = topBannerHeight + 20;
    const contentBottom = pageHeight - joinButtonHeight - bottomMargin - 20;
    const availableHeight = contentBottom - contentTop;
    
    const imagesPerPage = watermarkSettings.imagesPerPage;
    const imageHeight = availableHeight / imagesPerPage;
    const imageWidth = pageWidth - 40;
    
    uploadedImages.forEach((image, index) => {
        const pageIndex = Math.floor(index / imagesPerPage);
        const positionInPage = index % imagesPerPage;
        
        if (index > 0 && positionInPage === 0) {
            pdf.addPage();
        }
        
        // Add top banner
        if (watermarkSettings.showBanner) {
            pdf.setFillColor(240, 240, 240);
            pdf.rect(0, 0, pageWidth, topBannerHeight, 'F');
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(24);
            pdf.setTextColor(50, 50, 50);
            pdf.text("TET DSC TECH SQUAD", pageWidth / 2, topBannerHeight / 2 + 8, { align: "center" });
        }
        
        // Add logo if available
        if (logoImage && watermarkSettings.showLogo) {
            pdf.addImage(logoImage.src, "PNG", pageWidth - 50, 10, 40, 40);
            pdf.link(pageWidth - 50, 10, 40, 40, { url: TELEGRAM_LINK });
        }
        
        // Calculate image position
        const x = 20;
        const y = contentTop + (positionInPage * imageHeight);
        
        // Add image
        const img = new Image();
        img.onload = function() {
            const ratio = Math.min(imageWidth / img.width, imageHeight / img.height);
            const imgWidth = img.width * ratio;
            const imgHeight = img.height * ratio;
            const centeredX = x + (imageWidth - imgWidth) / 2;
            const centeredY = y + (imageHeight - imgHeight) / 2;
            
            pdf.addImage(img.src, "PNG", centeredX, centeredY, imgWidth, imgHeight);
            
            // Add join button
            if (watermarkSettings.showButton && positionInPage === imagesPerPage - 1) {
                const buttonX = (pageWidth - 120) / 2;
                const buttonY = pageHeight - joinButtonHeight - bottomMargin;
                
                pdf.setFillColor(59, 130, 246);
                pdf.roundedRect(buttonX, buttonY, 120, joinButtonHeight, 5, 5, 'F');
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.setTextColor(255, 255, 255);
                pdf.text("Join our group", pageWidth / 2, buttonY + joinButtonHeight / 2 + 5, { align: "center" });
                pdf.link(buttonX, buttonY, 120, joinButtonHeight, { url: TELEGRAM_LINK });
            }
            
            if (index === uploadedImages.length - 1) {
                pdf.save("TET_DSC_Tech_Squad.pdf");
                hideLoading();
            }
        };
        img.src = image.src;
    });
}

function resetAll() {
    uploadedImages = [];
    currentImageIndex = 0;
    logoImage = null;
    hideEditor();
    document.getElementById('fileInput').value = '';
    document.getElementById('logoInput').value = '';
    removeLogo();
}

function openTelegram() {
    window.open(TELEGRAM_LINK, '_blank');
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function toggleTheme() {
    // Theme toggle functionality (placeholder)
    document.body.classList.toggle('dark');
}

function loadSettings() {
    // Load settings from localStorage if available
    const saved = localStorage.getItem('watermarkSettings');
    if (saved) {
        watermarkSettings = { ...watermarkSettings, ...JSON.parse(saved) };
        // Update UI with loaded settings
        document.getElementById('watermarkText').value = watermarkSettings.text;
        document.getElementById('bgColor').value = watermarkSettings.bgColor;
        document.getElementById('bgColorText').value = watermarkSettings.bgColor;
        document.getElementById('textColor').value = watermarkSettings.textColor;
        document.getElementById('textColorText').value = watermarkSettings.textColor;
        document.getElementById('watermarkSize').value = watermarkSettings.size;
        document.getElementById('sizeValue').textContent = watermarkSettings.size;
        document.getElementById('offsetX').value = watermarkSettings.offsetX;
        document.getElementById('offsetXValue').textContent = watermarkSettings.offsetX;
        document.getElementById('offsetY').value = watermarkSettings.offsetY;
        document.getElementById('offsetYValue').textContent = watermarkSettings.offsetY;
        document.getElementById('showBanner').checked = watermarkSettings.showBanner;
        document.getElementById('showButton').checked = watermarkSettings.showButton;
        document.getElementById('imagesPerPage').value = watermarkSettings.imagesPerPage;
    }
}

// Save settings before page unload
window.addEventListener('beforeunload', function() {
    localStorage.setItem('watermarkSettings', JSON.stringify(watermarkSettings));
});

// Re-initialize icons after dynamic content changes
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            lucide.createIcons();
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});