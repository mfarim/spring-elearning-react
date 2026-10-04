package com.elearning.modules.announcement.service;

import com.elearning.modules.announcement.dto.AnnouncementDto;
import com.elearning.modules.announcement.dto.AnnouncementResponse;
import com.elearning.modules.announcement.entity.Announcement;
import com.elearning.modules.announcement.repository.AnnouncementRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> getAnnouncementsForUser(UserPrincipal principal) {
        if (principal == null) {
            return announcementRepository.findByPublishedTrueAndTargetInOrderByCreatedAtDesc(List.of("all"))
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) {
            return announcementRepository.findAllByOrderByCreatedAtDesc()
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
        List<String> targets = isTeacher ? List.of("all", "teacher") : List.of("all", "student");

        return announcementRepository.findByPublishedTrueAndTargetInOrderByCreatedAtDesc(targets)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public AnnouncementResponse createAnnouncement(AnnouncementDto dto) {
        Announcement announcement = Announcement.builder()
                .title(dto.getTitle())
                .content(dto.getContent())
                .target(dto.getTarget() != null ? dto.getTarget() : "all")
                .published(dto.isPublished())
                .build();

        return mapToResponse(announcementRepository.save(announcement));
    }

    @Transactional
    public AnnouncementResponse updateAnnouncement(Long id, AnnouncementDto dto) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + id));

        announcement.setTitle(dto.getTitle());
        announcement.setContent(dto.getContent());
        announcement.setTarget(dto.getTarget() != null ? dto.getTarget() : "all");
        announcement.setPublished(dto.isPublished());

        return mapToResponse(announcementRepository.save(announcement));
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        if (!announcementRepository.existsById(id)) {
            throw new IllegalArgumentException("Announcement not found: " + id);
        }
        announcementRepository.deleteById(id);
    }

    private AnnouncementResponse mapToResponse(Announcement a) {
        return AnnouncementResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .target(a.getTarget())
                .published(a.isPublished())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
