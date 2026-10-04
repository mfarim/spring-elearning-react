package com.elearning.modules.academic.service;

import com.elearning.modules.academic.dto.SubjectDto;
import com.elearning.modules.academic.dto.SubjectResponse;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.academic.repository.SubjectRepository;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public List<SubjectResponse> getAllSubjects() {
        return subjectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubjectResponse getSubjectById(Long id) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found with id: " + id));
        return mapToResponse(subject);
    }

    @Transactional
    public SubjectResponse createSubject(SubjectDto dto) {
        if (subjectRepository.findByCode(dto.getCode()).isPresent()) {
            throw new IllegalArgumentException("Subject code already exists: " + dto.getCode());
        }

        Teacher teacher = null;
        if (dto.getTeacherId() != null) {
            teacher = teacherRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new IllegalArgumentException("Teacher not found with id: " + dto.getTeacherId()));
        }

        Subject subject = Subject.builder()
                .name(dto.getName())
                .code(dto.getCode())
                .description(dto.getDescription())
                .teacher(teacher)
                .credits(dto.getCredits() != null ? dto.getCredits() : 2)
                .build();

        return mapToResponse(subjectRepository.save(subject));
    }

    @Transactional
    public SubjectResponse updateSubject(Long id, SubjectDto dto) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found with id: " + id));

        if (!subject.getCode().equals(dto.getCode()) && subjectRepository.findByCode(dto.getCode()).isPresent()) {
            throw new IllegalArgumentException("Subject code already in use: " + dto.getCode());
        }

        subject.setName(dto.getName());
        subject.setCode(dto.getCode());
        subject.setDescription(dto.getDescription());
        if (dto.getCredits() != null) {
            subject.setCredits(dto.getCredits());
        }

        if (dto.getTeacherId() != null) {
            Teacher teacher = teacherRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new IllegalArgumentException("Teacher not found with id: " + dto.getTeacherId()));
            subject.setTeacher(teacher);
        } else {
            subject.setTeacher(null);
        }

        return mapToResponse(subjectRepository.save(subject));
    }

    @Transactional
    public void deleteSubject(Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new IllegalArgumentException("Subject not found with id: " + id);
        }
        subjectRepository.deleteById(id);
    }

    private SubjectResponse mapToResponse(Subject s) {
        return SubjectResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .code(s.getCode())
                .description(s.getDescription())
                .teacherId(s.getTeacher() != null ? s.getTeacher().getId() : null)
                .teacherName(s.getTeacher() != null && s.getTeacher().getUser() != null ? s.getTeacher().getUser().getName() : null)
                .credits(s.getCredits())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
