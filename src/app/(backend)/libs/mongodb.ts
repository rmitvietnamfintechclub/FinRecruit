import dbConnect from '@/app/(backend)/libs/dbConnect';
import { Document } from 'mongodb';

export const getResponseCollectionData = async () => {
  const conn = await dbConnect();
  const finRecruitDb = conn.connection.useDb('FinRecruit');

  const responses = await finRecruitDb
    .collection<Document>('response')
    .find({})
    .toArray();

  return responses;
};
