package com.forms.service;

import com.forms.dto.SectionRequest;
import com.forms.dto.SectionResponse;
import com.forms.entity.Form;
import com.forms.entity.Section;
import com.forms.repository.FormRepository;
import com.forms.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SectionService {

    private final SectionRepository sectionRepository;
    private final FormRepository formRepository;

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
        if (!sectionRepository.existsById(sectionId)) {
            throw new IllegalArgumentException("Section not found with id: " + sectionId);
        }
        sectionRepository.deleteById(sectionId);
    }

}
