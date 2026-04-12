'use strict';

class NotificationManager {
    constructor(adapter) {
        this.adapter = adapter;
    }

    async send(message) {
        const cfg = this.adapter.config;

        // ioBroker telegram adapter
        if (cfg.notifyTelegram) {
            try {
                await this.adapter.sendToAsync('telegram', 'send', {
                    text: message,
                    user: cfg.telegramUser || undefined,
                });
            } catch (err) {
                this.adapter.log.warn('Telegram notification failed: ' + err.message);
            }
        }

        // ioBroker pushover adapter
        if (cfg.notifyPushover) {
            try {
                await this.adapter.sendToAsync('pushover', 'send', {
                    message,
                    title: 'Household Intelligence',
                });
            } catch (err) {
                this.adapter.log.warn('Pushover notification failed: ' + err.message);
            }
        }

        // ioBroker email adapter
        if (cfg.notifyEmail && cfg.emailTo) {
            try {
                await this.adapter.sendToAsync('email', 'send', {
                    to: cfg.emailTo,
                    subject: 'Household Intelligence',
                    text: message,
                });
            } catch (err) {
                this.adapter.log.warn('Email notification failed: ' + err.message);
            }
        }

        // Always log
        this.adapter.log.info('Notification: ' + message.substring(0, 100));
    }
}

module.exports = NotificationManager;
