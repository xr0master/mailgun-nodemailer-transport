import FormData from 'form-data';

import type { SubmitOptions } from 'form-data';
import type { SentMessageInfo, Transport, SendMailOptions } from 'nodemailer';
import type MailMessage from 'nodemailer/lib/mailer/mail-message';

import { postForm } from './services/Requestly';

type DoneCallback = (err: Error | null, info?: SentMessageInfo) => void;

const ADDRESS_KEYS = ['from', 'to', 'cc', 'bcc', 'replyTo'] as const;
const CONTENT_KEYS = ['subject', 'text', 'html'] as const;

const TRANSFORM_FIELDS: Partial<Record<(typeof ADDRESS_KEYS)[number], string>> = {
  replyTo: 'h:Reply-To',
};

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
      auth: `api:${options.auth.apiKey}`,
    };
  }

  private appendAddresses(form: FormData, data: SendMailOptions): void {
    ADDRESS_KEYS.forEach((target) => {
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
    CONTENT_KEYS.forEach((content) => {
      if (!data[content]) return;

      form.append(content, data[content]);
    });
  }

  private appendImages(form: FormData, data: SendMailOptions): void {
    if (!Array.isArray(data.attachments)) return;

    data.attachments.forEach((attachment) => {
      if (attachment.cid) {
        const buffer: Buffer = Buffer.from(
          attachment.content as string,
          attachment.encoding as BufferEncoding,
        );

        form.append('inline', buffer, {
          filename: attachment.cid,
          contentType: attachment.contentType,
          knownLength: buffer.length,
        });
      }
    });
  }

  private appendAttachments(form: FormData, data: SendMailOptions): void {
    if (!Array.isArray(data.attachments)) return;

    data.attachments.forEach((attachment) => {
      if (!attachment.cid) {
        const buffer: Buffer = Buffer.from(
          attachment.content as string,
          attachment.encoding as BufferEncoding,
        );

        form.append('attachment', buffer, {
          filename: attachment.filename || attachment.cid,
          contentType: attachment.contentType,
          knownLength: buffer.length,
        });
      }
    });
  }

  private submitForm(form: FormData): Promise<string> {
    return postForm(this.requestConfig, form);
  }

  public send(mail: MailMessage, done: DoneCallback): void {
    mail.normalize((error, data) => {
      if (error) return done(error);
      if (!data) return done(new Error('The email data is corrapted.'));

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
            message: form,
          });
        })
        .catch((e: Error) => done(e));
    });
  }
}

export default MailgunTransport;
