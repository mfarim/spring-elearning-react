import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { dashboard } from './dashboard';
import { teachers } from './teachers';
import { students } from './students';
import { classrooms } from './classrooms';
import { subjects } from './subjects';
import { announcements } from './announcements';
import { examList } from './examList';
import { examEditor } from './examEditor';
import { examMonitor } from './examMonitor';
import { examRunner } from './examRunner';
import { materialsList } from './materialsList';
import { materialDetail } from './materialDetail';
import { assignmentList } from './assignmentList';
import { assignmentDetail } from './assignmentDetail';
import { grades } from './grades';

/** One namespace per page (plus shared ones). Keys are used as t('namespace.key'). */
export const messages = {
  common,
  nav,
  auth,
  dashboard,
  teachers,
  students,
  classrooms,
  subjects,
  announcements,
  examList,
  examEditor,
  examMonitor,
  examRunner,
  materialsList,
  materialDetail,
  assignmentList,
  assignmentDetail,
  grades,
};
