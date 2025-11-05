// Lightweight branded notification utility for replacing window.alert
// Shows a dismissible toast with the title "Farm2Consumer:" in the corner

type NotifyOptions = {
  durationMs?: number; // Auto-hide after this duration
  variant?: 'info' | 'success' | 'warning' | 'error';
};

const VARIANT_STYLES: Record<NonNullable<NotifyOptions['variant']>, string> = {
  info: 'border-blue-500',
  success: 'border-green-500',
  warning: 'border-yellow-500',
  error: 'border-red-500'
};

export function notify(message: string, options: NotifyOptions = {}): void {
  const { durationMs = 3000, variant = 'info' } = options;

  // Container (one per page)
  let container = document.getElementById('f2c-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'f2c-toast-container';
    container.style.position = 'fixed';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  // Toast element
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.className = `f2c-toast shadow-2xl rounded-xl bg-white border-l-4 ${VARIANT_STYLES[variant]}`;
  toast.style.padding = '12px 14px';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '420px';
  toast.style.cursor = 'pointer';
  toast.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  toast.style.transform = 'translateX(20px)';
  toast.style.opacity = '0';

  // Title
  const title = document.createElement('div');
  title.textContent = 'Farm2Consumer:';
  title.style.fontWeight = '600';
  title.style.color = '#065f46'; // tailwind emerald-800-ish
  title.style.marginBottom = '4px';

  // Message
  const body = document.createElement('div');
  body.textContent = message;
  body.style.color = '#1f2937'; // gray-800
  body.style.fontSize = '14px';

  toast.appendChild(title);
  toast.appendChild(body);

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  const remove = () => {
    toast.style.transform = 'translateX(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
      // Clean up empty container
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    }, 200);
  };

  // Dismiss handlers
  toast.addEventListener('click', remove);
  if (durationMs > 0) {
    setTimeout(remove, durationMs);
  }
}

// Optional: Provide a drop-in override for window.alert without changing call sites
// Uncomment the following line if you prefer a global override:
// (window as any).alert = (msg: string) => notify(String(msg));

export default notify;


