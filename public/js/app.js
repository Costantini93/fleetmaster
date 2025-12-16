// Registrazione Service Worker per PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registrato:', registration.scope);
        
        // Controlla aggiornamenti ogni 60 secondi
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((error) => {
        console.error('❌ Errore registrazione Service Worker:', error);
      });
  });

  // Gestione aggiornamenti Service Worker
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// Gestione installazione PWA
let deferredPrompt;
const installButton = document.getElementById('installPWA');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA install prompt: ${outcome}`);
      deferredPrompt = null;
      installButton.style.display = 'none';
    });
  }
});

// Utility functions
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Conferma eliminazione
function confirmDelete(message) {
  return confirm(message || 'Sei sicuro di voler eliminare questo elemento?');
}

// Toggle sidebar mobile
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    if (sidebarOverlay) {
      sidebarOverlay.classList.toggle('active');
    }
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });
}

// Auto-hide flash messages
document.addEventListener('DOMContentLoaded', () => {
  const flashMessages = document.querySelectorAll('.flash-message');
  flashMessages.forEach((msg) => {
    setTimeout(() => {
      msg.style.opacity = '0';
      setTimeout(() => msg.remove(), 300);
    }, 5000);
  });
});

// Form validation helpers
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return true;
  
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;
    } else {
      input.classList.remove('error');
    }
  });
  
  return isValid;
}

// Canvas per firma digitale
class SignaturePad {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    
    this.setupCanvas();
    this.bindEvents();
  }
  
  setupCanvas() {
    // Imposta dimensioni canvas
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    
    // Stile linea
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }
  
  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }
  
  startDrawing(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }
  
  draw(e) {
    if (!this.isDrawing) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    this.lastX = x;
    this.lastY = y;
  }
  
  stopDrawing() {
    this.isDrawing = false;
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  getDataURL() {
    // Riduci qualità firma per risparmiare spazio (per Vercel limit)
    return this.canvas.toDataURL('image/jpeg', 0.7);
  }
}

// Inizializza firma se presente
const signatureCanvas = document.getElementById('signatureCanvas');
if (signatureCanvas) {
  const signaturePad = new SignaturePad('signatureCanvas');
  
  const clearBtn = document.getElementById('clearSignature');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => signaturePad.clear());
  }
  
  // Salva firma in campo hidden al submit
  const form = signatureCanvas.closest('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      const hiddenInput = document.getElementById('firma_partenza');
      if (hiddenInput) {
        hiddenInput.value = signaturePad.getDataURL();
      }
    });
  }
}

// Preview immagini prima dell'upload
function setupImagePreviews() {
  const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
  
  imageInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewId = input.dataset.preview;
        const preview = document.getElementById(previewId);
        
        if (preview) {
          preview.src = event.target.result;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    });
  });
}

document.addEventListener('DOMContentLoaded', setupImagePreviews);

// Loading spinner
function showLoading() {
  const spinner = document.createElement('div');
  spinner.id = 'loadingSpinner';
  spinner.className = 'loading-spinner';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
}

function hideLoading() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.remove();
}

// Export utility
window.RobiFleet = {
  showToast,
  confirmDelete,
  validateForm,
  showLoading,
  hideLoading,
  SignaturePad
};
