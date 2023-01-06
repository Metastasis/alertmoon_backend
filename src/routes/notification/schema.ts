import {Schema, model} from 'mongoose';

interface Notification {
  beneficiaryId: string,
  patternId: Schema.Types.ObjectId,
  content: string
}

const NotificationSchema = new Schema<Notification>({
  beneficiaryId: {type: String, required: true},
  patternId: {type: Schema.Types.ObjectId, ref: 'Pattern', required: true},
  content: {type: String, required: true},
}, {timestamps: true});


export const NotificationModel = model<Notification>('Notification', NotificationSchema);
