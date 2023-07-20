"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailgunTransport = void 0;
const http_1 = require("http");
const https_1 = require("https");
const form_data_1 = __importDefault(require("form-data"));
const TRANSFORM_FIELDS = {
    replyTo: 'h:Reply-To'
};
const ADDRESS_KEYS = ['from', 'to', 'cc', 'bcc', 'replyTo'];
const CONTENT_KEYS = ['subject', 'text', 'html'];
const combineTarget = (target) => {
    return target.name ? `${target.name} <${target.address}>` : target.address;
};
class MailgunTransport {
    constructor(options) {
        this.cids = {};
        this.name = 'MailgunTransport';
        this.version = 'N/A';
        const targetHostname = options.hostname || 'api.mailgun.net';
        const targetPath = `/v3/${options.auth.domain}/messages`;
        const auth = `api:${options.auth.apiKey}`;
        const agentOptions = options.agent ? { agent: options.agent } : {};
        this.isHttp =
            (options.proxy && !options.proxy.protocol.startsWith('https')) ||
                (options.agent && options.agent instanceof http_1.Agent);
        this.requestConfig = (!options.agent && options.proxy) ? {
            protocol: this.isHttp ? 'http:' : 'https:',
            host: options.proxy.host,
            port: options.proxy.port,
            path: `https://${targetHostname}${targetPath}`,
            headers: {
                Host: targetHostname
            },
            auth
        } : {
            protocol: 'https:',
            hostname: targetHostname,
            path: targetPath,
            ...agentOptions,
            auth
        };
    }
    findEmbeddedAttachments(data) {
        const content = (data.text || data.html);
        const matchInlineImages = [...content.matchAll(/["\[]cid:(.*?)["\]]/g)];
        this.cids = matchInlineImages.reduce((result, match) => {
            result[match[1]] = true;
            return result;
        }, {});
    }
    appendAddresses(form, data) {
        ADDRESS_KEYS.forEach(target => {
            if (!data[target])
                return;
            let value;
            if (Array.isArray(data[target])) {
                value = data[target].map(combineTarget).join(',');
            }
            else {
                value = combineTarget(data[target]);
            }
            form.append(TRANSFORM_FIELDS[target] || target, value);
        });
    }
    appendContent(form, data) {
        CONTENT_KEYS.forEach(content => {
            if (!data[content])
                return;
            form.append(TRANSFORM_FIELDS[content] || content, data[content]);
        });
    }
    appendImages(form, data) {
        if (!Array.isArray(data.attachments))
            return;
        data.attachments.forEach((attachment) => {
            if (attachment.contentType.startsWith('image/') && this.cids[attachment.cid]) {
                let buffer = Buffer.from(attachment.content, attachment.encoding);
                form.append('inline', buffer, {
                    filename: attachment.cid,
                    contentType: attachment.contentType,
                    knownLength: buffer.length
                });
            }
        });
    }
    appendAttachments(form, data) {
        if (!Array.isArray(data.attachments))
            return;
        data.attachments.forEach((attachment) => {
            if (!(attachment.contentType.startsWith('image/') && this.cids[attachment.cid])) {
                let buffer = Buffer.from(attachment.content, attachment.encoding);
                form.append('attachment', buffer, {
                    filename: attachment.filename || attachment.cid,
                    contentType: attachment.contentType,
                    knownLength: buffer.length
                });
            }
        });
    }
    submitForm(form) {
        return new Promise((resolve, reject) => {
            let req = (this.isHttp ? http_1.request : https_1.request)(Object.assign({
                method: 'POST',
                headers: form.getHeaders()
            }, this.requestConfig));
            form.pipe(req);
            req.on('response', (res) => {
                let chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    let answer = Buffer.concat(chunks).toString();
                    if (res.statusCode === 200) {
                        resolve(answer);
                    }
                    else {
                        reject(answer);
                    }
                });
                res.on('error', (error) => {
                    reject(error);
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
        });
    }
    send(mail, done) {
        setImmediate(() => {
            mail.normalize((error, data) => {
                if (error)
                    return done(error);
                this.findEmbeddedAttachments(data);
                const form = new form_data_1.default();
                this.appendAddresses(form, data);
                this.appendContent(form, data);
                this.appendImages(form, data);
                this.appendAttachments(form, data);
                this.submitForm(form)
                    .then(() => {
                    done(null, {
                        envelope: mail.message.getEnvelope(),
                        messageId: mail.message.messageId(),
                        message: form
                    });
                })
                    .catch((e) => done(e));
            });
        });
    }
}
exports.MailgunTransport = MailgunTransport;
exports.default = MailgunTransport;
