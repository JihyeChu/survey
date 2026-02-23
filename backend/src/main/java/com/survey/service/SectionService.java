package com.survey.service;

import com.survey.dto.SectionRequest;
import com.survey.dto.SectionResponse;
import com.survey.entity.Form;
import com.survey.entity.Section;
import com.survey.repository.FormRepository;
import com.survey.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SectionService {

    private final SectionRepository sectionRepository;
    private final FormRepository formRepository;
    private final FileStorageService fileStorageService;

    public SectionResponse createSection(Long formId, SectionRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        Section section = Section.builder()
                .form(form)
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .build();

        Section savedSection = sectionRepository.save(section);
        return SectionResponse.fromEntity(savedSection);
    }

    @Transactional(readOnly = true)
    public SectionResponse getSectionById(Long sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new IllegalArgumentException("Section not found with id: " + sectionId));

        return SectionResponse.fromEntity(section);
    }

    @Transactional(readOnly = true)
    public List<SectionResponse> getSectionsByFormId(Long formId) {
        if (!formRepository.existsById(formId)) {
            throw new IllegalArgumentException("Form not found with id: " + formId);
        }

        return sectionRepository.findByFormId(formId).stream()
                .map(SectionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public SectionResponse updateSection(Long sectionId, SectionRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new IllegalArgumentException("Section not found with id: " + sectionId));

        section.setTitle(request.getTitle());
        section.setDescription(request.getDescription());
        if (request.getOrderIndex() != null) {
            section.setOrderIndex(request.getOrderIndex());
        }

        Section updatedSection = sectionRepository.save(section);
        return SectionResponse.fromEntity(updatedSection);
    }

    public void deleteSection(Long sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new IllegalArgumentException("Section not found with id: " + sectionId));

        // 섹션 내 질문의 첨부파일 디스크에서 삭제
        if (section.getQuestions() != null) {
            section.getQuestions().forEach(question -> {
                if (question.getAttachmentStoredName() != null) {
                    try {
                        fileStorageService.deleteFile(question.getAttachmentStoredName());
                    } catch (IOException e) {
                        log.warn("Failed to delete attachment for question {} in section {}: {}",
                                question.getId(), sectionId, e.getMessage());
                    }
                }
            });
        }

        // JPA cascade (CascadeType.ALL + orphanRemoval)로 question도 DB에서 함께 삭제
        sectionRepository.delete(section);
    }

}
