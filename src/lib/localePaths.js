import { CONFIG } from './config.js';

export const DEFAULT_LOCALE = 'zh-CN';

const normalizePath = (path = '/') => {
    if (!path || path === '/') return '';
    return `/${path.replace(/^\/+|\/+$/g, '')}`;
};

/**
 * 获取指定语言与路径的规范相对 URL（带尾斜杠）
 * @param {string} locale 目标语言，如 'zh-CN', 'en', 'ja'
 * @param {string} path 业务路径，如 '/video-convert'
 */
export const getRelativeLocaleUrl = (locale = DEFAULT_LOCALE, path = '/') => {
    const matched = CONFIG.locals.find(item => item.toLowerCase() === String(locale).toLowerCase());
    const targetLocale = matched || DEFAULT_LOCALE;
    const cleanPath = normalizePath(path);

    // 默认语言（zh-CN）直接使用无前缀根路径，带标准尾斜杠
    if (targetLocale === DEFAULT_LOCALE) {
        return cleanPath ? `${cleanPath}/` : '/';
    }

    return `/${targetLocale}${cleanPath}/`;
};

/**
 * 根据当前 pathname 换算到目标语言的规范 URL
 * @param {string} currentPathname 当前请求的 pathname（如 /video-convert/ 或 /en/video-convert/）
 * @param {string} targetLocale 想要切换到的目标语言
 */
export const getSwitchLocaleUrl = (currentPathname = '/', targetLocale = DEFAULT_LOCALE) => {
    const parts = (currentPathname || '/').split('/').filter(Boolean);
    const firstPart = parts[0]?.toLowerCase();
    const hasLocalePrefix = CONFIG.locals.some(loc => loc.toLowerCase() === firstPart);

    // 提取纯业务路径（去除当前语言前缀）
    const businessParts = hasLocalePrefix ? parts.slice(1) : parts;
    const businessPath = businessParts.length > 0 ? `/${businessParts.join('/')}` : '';

    return getRelativeLocaleUrl(targetLocale, businessPath);
};
