import {Transport, SendMailOptions} from 'nodemailer';
import * as FormData from 'form-data';

const TRANSFORM_FIELDS: Object = {
  replyTo: 'h:Reply-To'
};

const ADDRESS_KEYS: Array<string> = ['from', 'to', 'cc', 'bcc', 'replyTo'];
const CONTENT_KEYS: Array<string> = ['subject', 'text', 'html'];

export interface Options {
  auth: {
    domain: string;
    apiKey: string;
  };
}

export class MailgunTransport implements Transport {

  private requestConfig: FormData.SubmitOptions;

  public name: string = 'MailgunTransport';
  public version: string = 'N/A';

  constructor(options: Options) {
    this.requestConfig = {
      protocol: 'http:',
      hostname: `api.mailgun.net`,
      path: `/v3/${options.auth.domain}/messages`,
      auth: `api:${options.auth.apiKey}`
    };
  }

  private combineTarget(target: {name: string; address: string}): string {
    return target.name ? `${target.name} <${target.address}>` : target.address;
  }

  private appendAddresses(form: FormData, data: SendMailOptions): void {
    ADDRESS_KEYS.forEach(target => {
      if (!data[target]) return;

      let value: string;

      if (Array.isArray(data[target])) {
        value = data[target].map(this.combineTarget).join(',');
      } else {
        value = this.combineTarget(data[target]);
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

  private appendAttachments(form: FormData, data: SendMailOptions): void {
    if (!Array.isArray(data.attachments)) return;

    data.attachments.forEach((attachment) => {
      let buffer: Buffer = Buffer.from(<string>attachment.content, attachment.encoding);

      form.append('inline', buffer, {
        filename: attachment.cid,
        contentType: attachment.contentType,
        knownLength: buffer.length
      });
    });
  }

  private submitForm(form: FormData): Promise<any> {
    return new Promise((resolve, reject) => {
      form.submit(this.requestConfig, (err, res) => {
        if (err) {
          res.resume();
          return reject(err);
        }

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
    });
  }

  public send(mail: any, done: Function): void {
    setImmediate(() => {
      mail.normalize((error, data: SendMailOptions) => {
        if (error) return done(error);

        let form: FormData = new FormData();

        this.appendAddresses(form, data);
        this.appendContent(form, data);
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
