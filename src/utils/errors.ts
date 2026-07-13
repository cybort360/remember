export class MemorySearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemorySearchError';
  }
}

export class RosterServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RosterServiceError';
  }
}

export class OrphanMonitorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrphanMonitorError';
  }
}

export class SeasonalTriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeasonalTriggerError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class RtsSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RtsSearchError';
  }
}

export class DecisionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionServiceError';
  }
}
