import React from 'react';
import { useRoute } from '@react-navigation/native';
import { PhotoUploadScreen } from '../shared/PhotoUploadScreen';

export function ReceivingPhotoScreen() {
  const route = useRoute<any>();
  const { shipmentId, recordId } = route.params;
  return (
    <PhotoUploadScreen
      title="Add receiving photo"
      uploadUrl={`/shipments/${shipmentId}/receiving/${recordId}/photos`}
    />
  );
}
