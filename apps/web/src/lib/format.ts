const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const time = new Intl.DateTimeFormat('en', { timeStyle: 'medium' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));
export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
