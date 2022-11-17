import {Schema, model} from 'mongoose';

interface SmsLog {
  content: string
}

interface Device {
  // TODO: поменять просто на id,
  //  т.к. не круто если будет везде в логах светиться номер телефона
  _id: string, // countryCode + mobileNumber
  mobileNumber: string
  countryCode: string
  smsLogs: SmsLog[]
}

const LogSchema = new Schema<SmsLog>({
  content: {type: String, required: true},
}, {timestamps: true});

const DeviceSchema = new Schema<Device>({
  _id: {type: String, required: true, unique: true},
  mobileNumber: {type: String, required: true},
  countryCode: {type: String, required: true},
  smsLogs: [LogSchema]
}, {timestamps: true});

export const DeviceModel = model<Device>('Device', DeviceSchema);
