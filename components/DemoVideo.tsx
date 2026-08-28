import { DEMO_VIDEO, hasPublicAsset } from '@/lib/demo-assets';
import Placeholder from '@/components/Placeholder';
import DemoVideoPlayer from '@/components/DemoVideoPlayer';

/**
 * Bloc démo vidéo — signature de la landing (section 2 ter).
 * Vérification serveur de la présence des fichiers : jamais de <video> cassé.
 */
export default function DemoVideo() {
  const hasMp4 = hasPublicAsset(DEMO_VIDEO.mp4);
  const hasWebm = hasPublicAsset(DEMO_VIDEO.webm);
  const hasPoster = hasPublicAsset(DEMO_VIDEO.poster);

  if (!hasMp4 && !hasWebm) {
    return (
      <div className="mx-auto" style={{ maxWidth: 320 }}>
        <Placeholder
          width={320}
          height={569}
          label="La démo vidéo arrive ici — voir /public/demo/README.md"
        />
      </div>
    );
  }

  return (
    <DemoVideoPlayer
      mp4={hasMp4 ? DEMO_VIDEO.mp4 : null}
      webm={hasWebm ? DEMO_VIDEO.webm : null}
      poster={hasPoster ? DEMO_VIDEO.poster : null}
    />
  );
}
