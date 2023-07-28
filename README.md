mailgun-nodemailer-transport
============================

## Intro
The custom transport plugin that allows to send email using Nodemailer via [Mailgun](https://mailgun.com/)

## Why?
Created for the new v3 Mailgun API and Nodemailer v4+. The plugin is very small, optimized and written in TypeScript

## Support the project
If you like to use this module please click the star button - it is very motivating.

## Quick Start
Install mailgun-nodemailer-transport using [npm](https://www.npmjs.com/):

``` bash
$ npm install mailgun-nodemailer-transport --save
```

## Documentation
[Nodemailer](https://nodemailer.com/message/#commmon-fields) common fields are supported and replyTo

## Examples

__send simple email__
``` js
  'use strict';
  const nodemailer = require('nodemailer');
  const MailgunTransport = require('mailgun-nodemailer-transport');

  let transporter = nodemailer.createTransport(new MailgunTransport({
    auth: {
      domain: 'your domain name https://app.mailgun.com/app/domains',
      apiKey: '12124124124124-key-test'
    }
  }));

  transporter.sendMail({
    from: 'email@example.com',
    to: 'recipient@test.com',
    replyTo: 'reply-to@example.com',
    subject: 'Mailgun Transport',
    text: 'This is text content'
  }).then((info) => {
    console.log('SUCCESS');
  }).catch((error) => {
    console.log('Something is wrong');
  });
```

__send attachment and add to content__
``` js
  'use strict';
  const nodemailer = require('nodemailer');
  const MailgunTransport = require('mailgun-nodemailer-transport');

  let transporter = nodemailer.createTransport(new MailgunTransport({
    auth: {
      domain: 'your domain name https://app.mailgun.com/app/domains',
      apiKey: '12124124124124-key-test'
    }
  }));

  transporter.sendMail({
    from: 'email@example.com',
    to: 'recipient@test.com',
    replyTo: 'reply-to@example.com',
    subject: 'Mailgun Transport',
    html: '<!DOCTYPE html><html><body><img src="cid:attachment" alt="attachment"></body></html>',
    attachments: [{
      content: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA...', // base64 content
      cid: 'attachment',
      contentType: 'image/jpeg',
      filename: 'attachment.jpg',
      encoding: 'base64'
    }]
  }).then((info) => {
    console.log('SUCCESS');
  }).catch((error) => {
    console.log('Something is wrong');
  });
```

## License

[MIT](./LICENSE)
