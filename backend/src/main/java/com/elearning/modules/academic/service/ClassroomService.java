package com.elearning.modules.academic.service;

import com.elearning.modules.academic.dto.ClassroomDto;
import com.elearning.modules.academic.dto.ClassroomResponse;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.repository.ClassroomRepository;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public List<ClassroomResponse> getAllClassrooms() {
        return classroomRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClassroomResponse getClassroomById(Long id) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found with id: " + id));
        return mapToResponse(classroom);
    }

    @Transactional
    public ClassroomResponse createClassroom(ClassroomDto dto) {
        Teacher teacher = null;
        if (dto.getHomeroomTeacherId() != null) {
            teacher = teacherRepository.findById(dto.getHomeroomTeacherId())
                    .orElseThrow(() -> new IllegalArgumentException("Homeroom teacher not found"));
        }

        Classroom classroom = Classroom.builder()
                .name(dto.getName())
                .level(dto.getLevel())
                .capacity(dto.getCapacity() != null ? dto.getCapacity() : 30)
                .academicYear(dto.getAcademicYear())
                .homeroomTeacher(teacher)
                .build();

        classroom = classroomRepository.save(classroom);
        return mapToResponse(classroom);
    }

    @Transactional
    public ClassroomResponse updateClassroom(Long id, ClassroomDto dto) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found with id: " + id));

        classroom.setName(dto.getName());
        classroom.setLevel(dto.getLevel());
        if (dto.getCapacity() != null) {
            classroom.setCapacity(dto.getCapacity());
        }
        classroom.setAcademicYear(dto.getAcademicYear());

        if (dto.getHomeroomTeacherId() != null) {
            Teacher teacher = teacherRepository.findById(dto.getHomeroomTeacherId())
                    .orElseThrow(() -> new IllegalArgumentException("Homeroom teacher not found"));
            classroom.setHomeroomTeacher(teacher);
        } else {
            classroom.setHomeroomTeacher(null);
        }

        return mapToResponse(classroomRepository.save(classroom));
    }

    @Transactional
    public void deleteClassroom(Long id) {
        if (!classroomRepository.existsById(id)) {
            throw new IllegalArgumentException("Classroom not found with id: " + id);
        }
        classroomRepository.deleteById(id);
    }

    private ClassroomResponse mapToResponse(Classroom c) {
        return ClassroomResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .level(c.getLevel())
                .capacity(c.getCapacity())
                .academicYear(c.getAcademicYear())
                .homeroomTeacherId(c.getHomeroomTeacher() != null ? c.getHomeroomTeacher().getId() : null)
                .homeroomTeacherName(c.getHomeroomTeacher() != null && c.getHomeroomTeacher().getUser() != null ? c.getHomeroomTeacher().getUser().getName() : null)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
