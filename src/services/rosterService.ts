import Airtable from 'airtable';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { RosterServiceError } from '../utils/errors';
import type { VolunteerRecord } from '../types';

const MAX_VOLUNTEER_LOOKUP_RESULTS = 1;
const INACTIVE_STATUS = 'Inactive';

let cachedVolunteersTable: Airtable.Table<Airtable.FieldSet> | undefined;

function getVolunteersTable(): Airtable.Table<Airtable.FieldSet> {
  if (cachedVolunteersTable === undefined) {
    const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);
    cachedVolunteersTable = base(config.airtable.volunteersTableId);
  }
  return cachedVolunteersTable;
}

function readStringField(record: Airtable.Record<Airtable.FieldSet>, field: string): string {
  const value: unknown = record.get(field);
  return typeof value === 'string' ? value : '';
}

function readDateField(record: Airtable.Record<Airtable.FieldSet>, field: string): Date {
  const value: unknown = record.get(field);
  return typeof value === 'string' || typeof value === 'number' ? new Date(value) : new Date(NaN);
}

function readStatusField(record: Airtable.Record<Airtable.FieldSet>): 'Active' | 'Inactive' {
  const value: unknown = record.get('Status');
  return value === INACTIVE_STATUS ? 'Inactive' : 'Active';
}

function mapRecordToVolunteer(record: Airtable.Record<Airtable.FieldSet>): VolunteerRecord {
  return {
    name: readStringField(record, 'Name'),
    slackUserId: readStringField(record, 'SlackUserId'),
    role: readStringField(record, 'Role'),
    status: readStatusField(record),
    joinDate: readDateField(record, 'JoinDate'),
    lastActiveDate: readDateField(record, 'LastActiveDate'),
  };
}

export async function findVolunteerBySlackId(slackUserId: string): Promise<VolunteerRecord | null> {
  try {
    const records = await getVolunteersTable()
      .select({
        filterByFormula: `{SlackUserId} = '${slackUserId}'`,
        maxRecords: MAX_VOLUNTEER_LOOKUP_RESULTS,
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    return mapRecordToVolunteer(records[0]);
  } catch (error) {
    logger.error('Airtable volunteer lookup failed', { slackUserId, error });
    throw new RosterServiceError('Unable to look up volunteer record.');
  }
}

export async function getInactiveVolunteers(): Promise<VolunteerRecord[]> {
  try {
    const records = await getVolunteersTable()
      .select({ filterByFormula: `{Status} = '${INACTIVE_STATUS}'` })
      .all();

    return records.map(mapRecordToVolunteer);
  } catch (error) {
    logger.error('Airtable inactive volunteer query failed', { error });
    throw new RosterServiceError('Unable to load inactive volunteers.');
  }
}
