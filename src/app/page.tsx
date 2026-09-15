import Vocal from '@/components/Vocal';
import { pageLang } from '@/lib/lang';

export default async function Home() {
  return <Vocal lang={await pageLang()} />;
}
