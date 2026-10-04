import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../../api/client';
import type { Exam, ExamMonitorItem, ApiResponse } from '../../types';
import {
  ArrowLeft,
  MonitorPlay,
  Users,
  AlertTriangle,
  CheckCircle2,
  Radio,
  RefreshCw,
} from 'lucide-react';

export const ExamMonitor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<ExamMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [recentAlert, setRecentAlert] = useState<string | null>(null);

  const stompClientRef = useRef<Client | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eRes, mRes] = await Promise.all([
        api.get<ApiResponse<Exam>>(`/exams/${id}`),
        api.get<ApiResponse<ExamMonitorItem[]>>(`/exams/${id}/monitor`),
      ]);
      setExam(eRes.data.data);
      setAttempts(mRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData();

    // Setup STOMP WebSocket client
    const socketFactory = () => new SockJS('/ws');
    const client = new Client({
      webSocketFactory: socketFactory,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setWsConnected(true);
        client.subscribe(`/topic/exams/${id}/monitor`, (message) => {
          try {
            const event = JSON.parse(message.body);
            handleRealtimeEvent(event);
          } catch (e) {
            console.error('Error handling WS message', e);
          }
        });
      },
      onDisconnect: () => {
        setWsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [id]);

  const handleRealtimeEvent = (event: any) => {
    const { eventType, data } = event;

    if (eventType === 'VIOLATION_REPORTED') {
      setRecentAlert(`🚨 VIOLATION: Student ${data.studentName} flagged for ${data.reason}!`);
      setTimeout(() => setRecentAlert(null), 6000);
    }

    // Refresh telemetry table
    api.get<ApiResponse<ExamMonitorItem[]>>(`/exams/${id}/monitor`)
      .then((r) => setAttempts(r.data.data))
      .catch(() => {});
  };

  const activeCount = attempts.filter((a) => a.status === 'in_progress').length;
  const completedCount = attempts.filter((a) => a.status === 'completed' || a.status === 'submitted').length;
  const totalViolations = attempts.reduce((acc, a) => acc + (a.violations || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/exams"
          className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Examinations</span>
        </Link>

        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              wsConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-500 animate-ping' : ''}`} />
            <span>{wsConnected ? 'Live Telemetry Active' : 'Connecting WebSocket...'}</span>
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {recentAlert && (
        <div className="bg-rose-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-rose-500/25 flex items-center space-x-3 text-sm font-bold animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{recentAlert}</span>
        </div>
      )}

      {exam && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                {exam.subjectName}
              </span>
              <span className="text-xs text-slate-400">Class: {exam.classroomName}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{exam.title}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-400">Exam Pass Mark</span>
            <div className="text-xl font-bold text-emerald-600">{exam.passingScore}%</div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Actively Taking Exam</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeCount} students</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Submitted & Completed</p>
            <h3 className="text-2xl font-bold text-slate-800">{completedCount} students</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Proctoring Violations</p>
            <h3 className="text-2xl font-bold text-rose-600">{totalViolations} flags</h3>
          </div>
        </div>
      </div>

      {/* Telemetry Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <MonitorPlay className="w-5 h-5 text-indigo-600" />
            <span>Real-time Candidate Telemetry</span>
          </h3>
          <span className="text-xs text-slate-400">Total Enrolled: {attempts.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading telemetry data...</div>
        ) : attempts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">No candidate sessions active</p>
            <p className="text-xs mt-1 text-slate-400">Students entering the CBT room will automatically appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Session Status</th>
                <th className="px-6 py-4">Questions Progress</th>
                <th className="px-6 py-4">Violations</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4 text-right">Started At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((att) => (
                <tr key={att.attemptId} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{att.studentName}</div>
                    <div className="text-xs font-mono text-slate-400">NIS: {att.nis}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        att.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700 animate-pulse'
                          : att.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {att.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${att.totalQuestions > 0 ? (att.answeredCount / att.totalQuestions) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {att.answeredCount}/{att.totalQuestions}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {att.violations > 0 ? (
                      <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{att.violations} Warning{att.violations > 1 ? 's' : ''}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">0 Flags</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {att.score !== null && att.score !== undefined ? (
                      <span className="font-bold text-slate-800 text-sm">
                        {att.score} / 100
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">In progress</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right text-xs text-slate-500">
                    {new Date(att.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
