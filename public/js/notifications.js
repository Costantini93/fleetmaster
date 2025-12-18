// ==================== SISTEMA NOTIFICHE ====================

class NotificationManager {
  constructor() {
    this.bell = document.getElementById('notificationBell');
    this.badge = document.getElementById('notificationBadge');
    this.dropdown = document.getElementById('notificationDropdown');
    this.list = document.getElementById('notificationList');
    this.markAllBtn = document.getElementById('markAllRead');
    
    if (!this.bell) return;
    
    this.init();
  }

  init() {
    // Event listeners
    this.bell.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.markAllBtn.addEventListener('click', () => this.markAllAsRead());

    // Chiudi dropdown quando clicchi fuori
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target) && !this.bell.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Carica notifiche al caricamento pagina
    this.loadNotifications();

    // Polling ogni 30 secondi
    setInterval(() => this.updateBadgeCount(), 30000);
  }

  async loadNotifications() {
    try {
      const response = await fetch('/notifications/unread');
      const data = await response.json();
      
      this.renderNotifications(data.notifications);
      this.updateBadge(data.notifications.length);
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
      this.list.innerHTML = '<div class="notification-empty">Errore caricamento notifiche</div>';
    }
  }

  async updateBadgeCount() {
    try {
      const response = await fetch('/notifications/count');
      const data = await response.json();
      this.updateBadge(data.count);
    } catch (error) {
      console.error('Errore aggiornamento badge:', error);
    }
  }

  renderNotifications(notifications) {
    if (!notifications || notifications.length === 0) {
      this.list.innerHTML = '<div class="notification-empty"><i class="fas fa-bell-slash"></i><br>Nessuna notifica</div>';
      return;
    }

    this.list.innerHTML = notifications.map(notif => `
      <div class="notification-item ${notif.letta ? '' : 'unread'}" data-id="${notif.id}" onclick="notificationManager.handleNotificationClick(${notif.id}, '${notif.link || ''}')">
        <div class="notification-icon ${this.getNotificationType(notif.tipo)}">
          <i class="${this.getNotificationIcon(notif.tipo)}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${this.escapeHtml(notif.titolo)}</div>
          <div class="notification-message">${this.escapeHtml(notif.messaggio)}</div>
          <div class="notification-time">${this.getTimeAgo(notif.data_creazione)}</div>
        </div>
      </div>
    `).join('');
  }

  getNotificationType(tipo) {
    const types = {
      'scadenza_documento': 'warning',
      'scadenza_contratto': 'warning',
      'manutenzione_km': 'info',
      'manutenzione_urgente': 'error',
      'info': 'info',
      'warning': 'warning',
      'error': 'error'
    };
    return types[tipo] || 'info';
  }

  getNotificationIcon(tipo) {
    const icons = {
      'scadenza_documento': 'fas fa-file-alt',
      'scadenza_contratto': 'fas fa-file-contract',
      'manutenzione_km': 'fas fa-wrench',
      'manutenzione_urgente': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle',
      'warning': 'fas fa-exclamation-triangle',
      'error': 'fas fa-times-circle'
    };
    return icons[tipo] || 'fas fa-bell';
  }

  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Proprio ora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min fa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ore fa`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} giorni fa`;
    
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  async handleNotificationClick(id, link) {
    try {
      await fetch(`/notifications/read/${id}`, { method: 'POST' });
      this.updateBadgeCount();
      
      if (link) {
        window.location.href = link;
      }
    } catch (error) {
      console.error('Errore aggiornamento notifica:', error);
    }
  }

  async markAllAsRead() {
    try {
      await fetch('/notifications/read-all', { method: 'POST' });
      this.loadNotifications();
      this.updateBadge(0);
    } catch (error) {
      console.error('Errore aggiornamento notifiche:', error);
    }
  }

  updateBadge(count) {
    if (count > 0) {
      this.badge.textContent = count > 99 ? '99+' : count;
      this.badge.style.display = 'flex';
    } else {
      this.badge.style.display = 'none';
    }
  }

  toggleDropdown() {
    const isVisible = this.dropdown.classList.contains('show');
    if (isVisible) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.dropdown.classList.add('show');
    this.loadNotifications();
  }

  closeDropdown() {
    this.dropdown.classList.remove('show');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Inizializza quando il DOM è pronto
let notificationManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
  });
} else {
  notificationManager = new NotificationManager();
}
