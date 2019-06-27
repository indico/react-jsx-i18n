import moment from 'moment-timezone';

Date.now = jest.fn(() => 1523917200000);
moment.tz.setDefault('UTC');
