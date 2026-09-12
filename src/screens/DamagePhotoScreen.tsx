import React from 'react';
import { useRoute } from '@react-navigation/native';
import { PhotoUploadScreen } from '../shared/PhotoUploadScreen';

export function DamagePhotoScreen() {
  const route = useRoute<any>();
  const { shipmentId, reportId } = route.params;
  return (
    <PhotoUploadScreen
      title="Add damage photo"
      uploadUrl={`/shipments/${shipmentId}/damage-reports/${reportId}/photos`}
    />
  );
}
