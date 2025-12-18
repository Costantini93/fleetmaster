// ==================== PUSH NOTIFICATIONS ====================

class PushNotificationManager {
  constructor() {
    this.swRegistration = null;
    this.publicKey = null;
    this.init();
  }

  async init() {
    // Verifica supporto
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('⚠️  Push notifications non supportate');
      return;
    }

    try {
      // Registra service worker
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registrato');

      // Ottieni public key
      const response = await fetch('/notifications/vapid-public-key');
      const data = await response.json();
      this.publicKey = data.publicKey;

      if (!this.publicKey) {
        console.log('⚠️  VAPID key non configurata');
        return;
      }

      // Verifica permission
      const permission = await this.checkPermission();
      
      // Mostra pulsante per attivare se non ancora fatto
      if (permission === 'default') {
        this.showEnableButton();
      } else if (permission === 'granted') {
        await this.subscribe();
      }

    } catch (error) {
      console.error('Errore inizializzazione push:', error);
    }
  }

  async checkPermission() {
    return Notification.permission;
  }

  showEnableButton() {
    // Aggiungi pulsante per attivare notifiche
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('enablePushBtn')) return;

    const button = document.createElement('button');
    button.id = 'enablePushBtn';
    button.className = 'btn btn-sm';
    button.innerHTML = '<i class="fas fa-bell"></i> Attiva Notifiche Push';
    button.style.marginLeft = '1rem';
    button.onclick = () => this.requestPermission();

    topbarRight.appendChild(button);
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await this.subscribe();
        
        // Rimuovi pulsante
        const btn = document.getElementById('enablePushBtn');
        if (btn) btn.remove();
        
        // Mostra conferma
        this.showToast('✅ Notifiche push attivate!', 'success');
      } else {
        this.showToast('⚠️  Permesso negato', 'warning');
      }
    } catch (error) {
      console.error('Errore richiesta permesso:', error);
      this.showToast('❌ Errore attivazione notifiche', 'error');
    }
  }

  async subscribe() {
    try {
      // Verifica se già sottoscritto
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('✅ Già sottoscritto alle push');
        return;
      }

      // Crea nuova subscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
      });

      // Invia al server
      const response = await fetch('/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Subscription salvata sul server');
      }
    } catch (error) {
      console.error('Errore subscription:', error);
    }
  }

  async unsubscribe() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notifica il server
        await fetch('/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        
        console.log('✅ Unsubscribed');
      }
    } catch (error) {
      console.error('Errore unsubscribe:', error);
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  showToast(message, type = 'info') {
    // Crea toast notification
    const toast = document.createElement('div');
    toast.className = `flash-message flash-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.style.animation = 'slideInRight 0.3s ease';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Inizializza quando il DOM è pronto
let pushManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pushManager = new PushNotificationManager();
  });
} else {
  pushManager = new PushNotificationManager();
}
