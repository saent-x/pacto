import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { MemoryComposer } from '@/src/components/ui/pacto/memories/MemoryComposer';

export default function MemoryComposerSheet() {
  return (
    <FeatureRouteGuard featureId="memoryFeed">
      <MemoryComposer />
    </FeatureRouteGuard>
  );
}
