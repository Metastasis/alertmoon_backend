import {Schema, model} from 'mongoose';

interface SmsLog {
  content: string
}

interface Device {
  mobileNumber: string
  smsLogs: SmsLog[]
}

const LogSchema = new Schema<SmsLog>({
  content: {type: String, required: true},
}, {timestamps: true});

const DeviceSchema = new Schema<Device>({
  mobileNumber: {type: String, required: true, unique: true},
  smsLogs: [LogSchema]
}, {timestamps: true});

export const DeviceModel = model<Device>('Device', DeviceSchema);
