package com.elearning.modules.user.service;

import com.elearning.common.enums.Gender;
import com.elearning.common.enums.RoleType;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.repository.ClassroomRepository;
import com.elearning.modules.user.dto.StudentDto;
import com.elearning.modules.user.dto.StudentExamCardResponse;
import com.elearning.modules.user.dto.StudentResponse;
import com.elearning.modules.user.entity.Role;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.RoleRepository;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ClassroomRepository classroomRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<StudentResponse> getStudents(Long classroomId) {
        List<Student> students;
        if (classroomId != null) {
            students = studentRepository.findByClassroomId(classroomId);
        } else {
            students = studentRepository.findAll();
        }
        return students.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));
        return mapToResponse(student);
    }

    @Transactional
    public StudentResponse createStudent(StudentDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + dto.getEmail());
        }
        if (studentRepository.existsByNis(dto.getNis())) {
            throw new IllegalArgumentException("NIS is already registered: " + dto.getNis());
        }

        Role studentRole = roleRepository.findByName(RoleType.ROLE_STUDENT)
                .orElseThrow(() -> new IllegalStateException("ROLE_STUDENT not found"));

        String rawPassword = (dto.getPassword() != null && !dto.getPassword().isBlank()) ? dto.getPassword() : "Student@123";

        User user = User.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .phone(dto.getPhone())
                .active(true)
                .roles(new HashSet<>(Collections.singletonList(studentRole)))
                .build();

        user = userRepository.save(user);

        Classroom classroom = null;
        if (dto.getClassroomId() != null) {
            classroom = classroomRepository.findById(dto.getClassroomId())
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found with id: " + dto.getClassroomId()));
        }

        Student student = Student.builder()
                .user(user)
                .classroom(classroom)
                .nis(dto.getNis())
                .nisn(dto.getNisn())
                .birthDate(dto.getBirthDate())
                .gender(dto.getGender())
                .address(dto.getAddress())
                .photo(dto.getPhoto())
                .build();

        return mapToResponse(studentRepository.save(student));
    }

    @Transactional
    public StudentResponse updateStudent(Long id, StudentDto dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        User user = student.getUser();
        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + dto.getEmail());
        }
        if (!student.getNis().equals(dto.getNis()) && studentRepository.existsByNis(dto.getNis())) {
            throw new IllegalArgumentException("NIS is already registered: " + dto.getNis());
        }

        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        userRepository.save(user);

        if (dto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found with id: " + dto.getClassroomId()));
            student.setClassroom(classroom);
        } else {
            student.setClassroom(null);
        }

        student.setNis(dto.getNis());
        student.setNisn(dto.getNisn());
        student.setBirthDate(dto.getBirthDate());
        student.setGender(dto.getGender());
        student.setAddress(dto.getAddress());
        if (dto.getPhoto() != null) {
            student.setPhoto(dto.getPhoto());
        }

        return mapToResponse(studentRepository.save(student));
    }

    @Transactional
    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));
        studentRepository.delete(student);
        userRepository.delete(student.getUser());
    }

    @Transactional
    public Map<String, Object> importStudentsFromExcel(MultipartFile file, Long classroomId) {
        Classroom classroom = null;
        if (classroomId != null) {
            classroom = classroomRepository.findById(classroomId)
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found with id: " + classroomId));
        }

        Role studentRole = roleRepository.findByName(RoleType.ROLE_STUDENT)
                .orElseThrow(() -> new IllegalStateException("ROLE_STUDENT not found"));

        int successCount = 0;
        int errorCount = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            // Row 0 is header: [Name, Email, NIS, NISN, Gender (M/F), Phone, Address]
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                try {
                    String name = formatter.formatCellValue(row.getCell(0)).trim();
                    String email = formatter.formatCellValue(row.getCell(1)).trim();
                    String nis = formatter.formatCellValue(row.getCell(2)).trim();
                    String nisn = formatter.formatCellValue(row.getCell(3)).trim();
                    String genderStr = formatter.formatCellValue(row.getCell(4)).trim().toUpperCase();
                    String phone = formatter.formatCellValue(row.getCell(5)).trim();
                    String address = formatter.formatCellValue(row.getCell(6)).trim();

                    if (name.isEmpty() || email.isEmpty() || nis.isEmpty()) {
                        continue;
                    }

                    if (userRepository.existsByEmail(email)) {
                        errors.add("Row " + (r + 1) + ": Email " + email + " already exists");
                        errorCount++;
                        continue;
                    }
                    if (studentRepository.existsByNis(nis)) {
                        errors.add("Row " + (r + 1) + ": NIS " + nis + " already exists");
                        errorCount++;
                        continue;
                    }

                    Gender gender = Gender.M;
                    if ("F".equals(genderStr) || "P".equals(genderStr) || "FEMALE".equals(genderStr) || "PEREMPUAN".equals(genderStr)) {
                        gender = Gender.F;
                    }

                    User user = User.builder()
                            .name(name)
                            .email(email)
                            .password(passwordEncoder.encode("Student@123"))
                            .phone(phone.isEmpty() ? null : phone)
                            .active(true)
                            .roles(new HashSet<>(Collections.singletonList(studentRole)))
                            .build();

                    user = userRepository.save(user);

                    Student student = Student.builder()
                            .user(user)
                            .classroom(classroom)
                            .nis(nis)
                            .nisn(nisn.isEmpty() ? null : nisn)
                            .gender(gender)
                            .address(address.isEmpty() ? null : address)
                            .build();

                    studentRepository.save(student);
                    successCount++;
                } catch (Exception ex) {
                    errors.add("Row " + (r + 1) + " error: " + ex.getMessage());
                    errorCount++;
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse excel file", e);
            throw new RuntimeException("Failed to read Excel file: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("errorCount", errorCount);
        result.put("errors", errors);
        return result;
    }

    @Transactional(readOnly = true)
    public List<StudentExamCardResponse> getExamCards(Long classroomId) {
        List<Student> students;
        if (classroomId != null) {
            students = studentRepository.findByClassroomId(classroomId);
        } else {
            students = studentRepository.findAll();
        }

        return students.stream().map(s -> {
            String classroomName = s.getClassroom() != null ? s.getClassroom().getName() : "-";
            String academicYear = s.getClassroom() != null ? s.getClassroom().getAcademicYear() : "-";
            String barcodeData = "EXAM-" + s.getNis() + "-" + (s.getNisn() != null ? s.getNisn() : "0");

            return StudentExamCardResponse.builder()
                    .studentId(s.getId())
                    .name(s.getUser().getName())
                    .nis(s.getNis())
                    .nisn(s.getNisn())
                    .gender(s.getGender())
                    .birthDate(s.getBirthDate())
                    .classroomName(classroomName)
                    .academicYear(academicYear)
                    .barcodeData(barcodeData)
                    .build();
        }).collect(Collectors.toList());
    }

    private StudentResponse mapToResponse(Student s) {
        return StudentResponse.builder()
                .id(s.getId())
                .userId(s.getUser().getId())
                .name(s.getUser().getName())
                .email(s.getUser().getEmail())
                .phone(s.getUser().getPhone())
                .nis(s.getNis())
                .nisn(s.getNisn())
                .birthDate(s.getBirthDate())
                .gender(s.getGender())
                .address(s.getAddress())
                .photo(s.getPhoto())
                .classroomId(s.getClassroom() != null ? s.getClassroom().getId() : null)
                .classroomName(s.getClassroom() != null ? s.getClassroom().getName() : null)
                .active(s.getUser().isActive())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
