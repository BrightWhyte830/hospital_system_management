const GHIconSystem = {
  enhance(root = document) {
    root.querySelectorAll('.ico, .si, .stat-ico, .qa-ico, .ct-ico, .eico, .mflag, .hero-service > span, .service-tile > span, .why-list > div > span, .ssc-ico, .ar-ico').forEach((icon) => {
      icon.setAttribute('aria-hidden', 'true');
    });
    root.querySelectorAll('.alert').forEach((alert) => {
      alert.setAttribute('role', 'alert');
      alert.setAttribute('aria-live', 'assertive');
    });
    root.querySelectorAll('.modal-ov').forEach((modal) => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
    });
    root.querySelectorAll('.mc').forEach((button) => {
      button.setAttribute('aria-label', 'Close dialog');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => GHIconSystem.enhance());
