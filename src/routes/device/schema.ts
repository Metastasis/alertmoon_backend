import {Schema, model} from 'mongoose';

interface SmsLog {
  content: string
}

interface Device {
  _id: string, // countryCode + mobileNumber
  mobileNumber: string
  countryCode: string
  smsLogs: SmsLog[]
}

const LogSchema = new Schema<SmsLog>({
  content: {type: String, required: true},
});

const DeviceSchema = new Schema<Device>({
  _id: {type: String, required: true, unique: true},
  mobileNumber: {type: String, required: true},
  countryCode: {type: String, required: true},
  smsLogs: [LogSchema]
});

export const DeviceModel = model<Device>('Device', DeviceSchema);
