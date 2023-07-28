import { postForm } from './Requestly';
import FormData from 'form-data';

interface HTTPBin {
  form?: {
    id: string;
  };
}

it('should send post request', async () => {
  const form = new FormData();
  form.append('id', 'test');

  return postForm(
    {
      protocol: 'https:',
      hostname: 'httpbin.org',
      path: '/post',
    },
    form,
  ).then(
    (data) => {
      console.log(data);
      expect((data as HTTPBin).form!.id).toBe('test');
    },
    (error) => {
      throw error;
    },
  );
});
