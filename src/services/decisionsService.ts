import Airtable from 'airtable';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { DecisionServiceError } from '../utils/errors';
import type { DecisionRecord } from '../types';

const CATEGORIES: readonly DecisionRecord['category'][] = [
  'Shelter',
  'Supply',
  'Policy',
  'Logistics',
  'Medical',
];
const STATUSES: readonly DecisionRecord['status'][] = ['Active', 'Orphaned', 'Resolved'];
const DEFAULT_CATEGORY: DecisionRecord['category'] = 'Policy';
const DEFAULT_STATUS: DecisionRecord['status'] = 'Active';

let cachedDecisionsTable: Airtable.Table<Airtable.FieldSet> | undefined;

function getDecisionsTable(): Airtable.Table<Airtable.FieldSet> {
  if (cachedDecisionsTable === undefined) {
    const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);
    cachedDecisionsTable = base(config.airtable.decisionsTableId);
  }
  return cachedDecisionsTable;
}

function readStringField(record: Airtable.Record<Airtable.FieldSet>, field: string): string {
  const value: unknown = record.get(field);
  return typeof value === 'string' ? value : '';
}

function readDateField(record: Airtable.Record<Airtable.FieldSet>, field: string): Date | null {
  const value: unknown = record.get(field);
  return typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
}

function readCategory(record: Airtable.Record<Airtable.FieldSet>): DecisionRecord['category'] {
  const value: unknown = record.get('Category');
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
    ? (value as DecisionRecord['category'])
    : DEFAULT_CATEGORY;
}

function readStatus(record: Airtable.Record<Airtable.FieldSet>): DecisionRecord['status'] {
  const value: unknown = record.get('Status');
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
    ? (value as DecisionRecord['status'])
    : DEFAULT_STATUS;
}

function mapRecordToDecision(record: Airtable.Record<Airtable.FieldSet>): DecisionRecord {
  return {
    decisionTitle: readStringField(record, 'DecisionTitle'),
    slackThreadLink: readStringField(record, 'SlackThreadLink'),
    ownerSlackId: readStringField(record, 'OwnerSlackId'),
    category: readCategory(record),
    lastVerified: readDateField(record, 'LastVerified'),
    status: readStatus(record),
  };
}

export async function getAllDecisions(): Promise<DecisionRecord[]> {
  try {
    const records = await getDecisionsTable().select().all();
    return records.map(mapRecordToDecision);
  } catch (error) {
    logger.error('Airtable decisions query failed', { error });
    throw new DecisionServiceError('Unable to load decisions.');
  }
}
