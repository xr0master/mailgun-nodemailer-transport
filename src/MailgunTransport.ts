import {request} from 'https';
import FormData from 'form-data';

import type {SubmitOptions} from 'form-data';
import type {ClientRequest, IncomingMessage} from 'http';
import type {SentMessageInfo, Transport, SendMailOptions} from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';

const TRANSFORM_FIELDS = {
  replyTo: 'h:Reply-To'
} as const;

const ADDRESS_KEYS = ['from', 'to', 'cc', 'bcc', 'replyTo'] as const;
const CONTENT_KEYS = ['subject', 'text', 'html'] as const;

interface Address {
  name: string;
  address: string;
}

export interface Options {
  hostname?: string;
  auth: {
    domain: string;
    apiKey: string;
  };
}

const combineTarget = (target: Address): string => {
  return target.name ? `${target.name} <${target.address}>` : target.address;
};

export class MailgunTransport implements Transport {

  private readonly requestConfig: SubmitOptions;

  public name = 'MailgunTransport';
  public version = 'N/A';

  constructor(options: Options) {
    this.requestConfig = {
      protocol: 'https:',
      hostname: options.hostname || 'api.mailgun.net',
      path: `/v3/${options.auth.domain}/messages`,
      auth: `api:${options.auth.apiKey}`
    };
  }

  private appendAddresses(form: FormData, data: SendMailOptions): void {
    ADDRESS_KEYS.forEach(target => {
      if (!data[target]) return;

      let value: string;

      if (Array.isArray(data[target])) {
        value = (data[target] as Address[]).map(combineTarget).join(',');
      } else {
        value = combineTarget(data[target] as Address);
      }

      form.append(TRANSFORM_FIELDS[target] || target, value);
    });
  }

  private appendContent(form: FormData, data: SendMailOptions): void {
    CONTENT_KEYS.forEach(content => {
      if (!data[content]) return;

      form.append(TRANSFORM_FIELDS[content] || content, data[content]);
    });
  }

  private appendImages(form: FormData, data: SendMailOptions): void {
    if (!Array.isArray(data.attachments)) return;

    data.attachments.forEach((attachment) => {
      if (attachment.contentType.startsWith('image/')) {
        let buffer: Buffer = Buffer.from(attachment.content as string, attachment.encoding as BufferEncoding);

        form.append('inline', buffer, {
          filename: attachment.cid,
          contentType: attachment.contentType,
          knownLength: buffer.length
        });
      }
    });
  }

  private appendAttachments(form: FormData, data: SendMailOptions): void {
    if (!Array.isArray(data.attachments)) return;

    data.attachments.forEach((attachment) => {
      if (!attachment.contentType.startsWith('image/')) {
        let buffer: Buffer = Buffer.from(attachment.content as string, attachment.encoding as BufferEncoding);

        form.append('attachment', buffer, {
          filename: attachment.filename || attachment.cid,
          contentType: attachment.contentType,
          knownLength: buffer.length
        });
      }
    });
  }

  private submitForm(form: FormData): Promise<any> {
    return new Promise((resolve, reject) => {
      let req: ClientRequest = request(Object.assign({
        method: 'POST',
        headers: form.getHeaders()
      }, this.requestConfig));

      form.pipe(req);

      req.on('response', (res: IncomingMessage) => {
        let chunks: Array<any> = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          let answer: any = Buffer.concat(chunks).toString();

          if (res.statusCode === 200) {
            resolve(answer);
          } else {
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

  public send(mail: MailMessage, done: (err: Error | null, info?: SentMessageInfo) => void): void {
    setImmediate(() => {
      mail.normalize((error, data: SendMailOptions) => {
        if (error) return done(error);

        const form = new FormData();

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

export default MailgunTransport;
