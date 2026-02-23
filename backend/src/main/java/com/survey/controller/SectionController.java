package com.survey.controller;

import com.survey.dto.SectionRequest;
import com.survey.dto.SectionResponse;
import com.survey.service.SectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/forms/{formId}/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PostMapping
    public ResponseEntity<SectionResponse> createSection(@PathVariable Long formId, @RequestBody SectionRequest request) {
        log.info("Creating section for formId: {}", formId);
        SectionResponse response = sectionService.createSection(formId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<SectionResponse>> getSections(@PathVariable Long formId) {
        log.info("Fetching sections for formId: {}", formId);
        List<SectionResponse> responses = sectionService.getSectionsByFormId(formId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{sectionId}")
    public ResponseEntity<SectionResponse> getSection(@PathVariable Long formId, @PathVariable Long sectionId) {
        log.info("Fetching section {} for formId: {}", sectionId, formId);
        SectionResponse response = sectionService.getSectionById(sectionId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{sectionId}")
    public ResponseEntity<SectionResponse> updateSection(@PathVariable Long formId, @PathVariable Long sectionId, @RequestBody SectionRequest request) {
        log.info("Updating section {} for formId: {}", sectionId, formId);
        SectionResponse response = sectionService.updateSection(sectionId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{sectionId}")
    public ResponseEntity<Void> deleteSection(@PathVariable Long formId, @PathVariable Long sectionId) {
        log.info("Deleting section {} for formId: {}", sectionId, formId);
        sectionService.deleteSection(sectionId);
        return ResponseEntity.noContent().build();
    }

}
