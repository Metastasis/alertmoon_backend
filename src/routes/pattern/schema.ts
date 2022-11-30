import {Schema, model} from 'mongoose';

interface Pattern {
  beneficiaryId: string;
  sender: string;
  content?: string;
}

const PatternSchema = new Schema<Pattern>({
  beneficiaryId: {type: String, required: true},
  sender: {type: String, required: true},
  content: {type: String}
}, {timestamps: true});

export const PatternModel = model<Pattern>('Pattern', PatternSchema);
