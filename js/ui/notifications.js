function _createElement(tag, classNames = [], attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    if (classNames.length) {
        element.classList.add(...classNames);
    }
    for (const attr in attributes) {
        element.setAttribute(attr, attributes[attr]);
    }
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
}

export function showNotification(message, type = 'info') { // types: success, error, info
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    const iconMap = {
        success: 'check-circle-fill',
        error: 'x-circle-fill',
        info: 'info-circle-fill'
    };

    const toast = _createElement('div', ['toast-notification', type]);
    const icon = _createElement('i', ['bi', `bi-${iconMap[type]}`, 'icon']);
    const msg = _createElement('div', ['message'], {}, message);

    toast.appendChild(icon);
    toast.appendChild(msg);

    notificationContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}
