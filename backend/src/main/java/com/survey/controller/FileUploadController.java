package com.survey.controller;

import com.survey.dto.FileMetadataResponse;
import com.survey.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * 임시 파일 업로드 (응답 제출 전)
     * formId와 questionId를 form data로 받음
     */
    @PostMapping("/files/upload")
    public ResponseEntity<FileMetadataResponse> uploadFileTemp(
            @RequestParam("file") MultipartFile file,
            @RequestParam("formId") String formId,
            @RequestParam("questionId") String questionId) {
        try {
            log.info("Received temp file upload request for formId: {}, questionId: {}, fileName: {}",
                    formId, questionId, file.getOriginalFilename());

            // 임시로 파일만 저장하고 메타데이터 반환 (responseId 없이)
            FileMetadataResponse fileMetadata = fileUploadService.uploadTempFile(formId, questionId, file);

            log.info("Temp file uploaded successfully with id: {}", fileMetadata.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(fileMetadata);
        } catch (IOException e) {
            log.error("Failed to upload temp file for formId: {}, questionId: {}", formId, questionId, e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    @PostMapping("/responses/{responseId}/questions/{questionId}/files")
    public ResponseEntity<FileMetadataResponse> uploadFile(
            @PathVariable Long responseId,
            @PathVariable Long questionId,
            @RequestParam("file") MultipartFile file) {
        try {
            log.info("Received file upload request for responseId: {}, questionId: {}, fileName: {}",
                    responseId, questionId, file.getOriginalFilename());

            FileMetadataResponse fileMetadata = fileUploadService.uploadFile(responseId, questionId, file);

            log.info("File uploaded successfully with id: {}", fileMetadata.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(fileMetadata);
        } catch (IOException e) {
            log.error("Failed to upload file for responseId: {}, questionId: {}", responseId, questionId, e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    @GetMapping("/files/{fileMetadataId}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long fileMetadataId) {
        try {
            log.info("Received file download request for fileMetadataId: {}", fileMetadataId);

            FileMetadataResponse fileMetadata = fileUploadService.getFileMetadata(fileMetadataId);
            byte[] fileContent = fileUploadService.downloadFile(fileMetadataId);

            HttpHeaders headers = new HttpHeaders();
            ContentDisposition contentDisposition = ContentDisposition.attachment()
                    .filename(fileMetadata.getOriginalFilename(), StandardCharsets.UTF_8)
                    .build();
            headers.setContentDisposition(contentDisposition);
            headers.set(HttpHeaders.CONTENT_TYPE, fileMetadata.getContentType());
            headers.setContentLength(fileContent.length);

            log.info("File downloaded successfully: {}", fileMetadata.getOriginalFilename());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (IOException e) {
            log.error("Failed to download file with id: {}", fileMetadataId, e);
            throw new RuntimeException("File download failed: " + e.getMessage(), e);
        }
    }

    @GetMapping("/files/{fileMetadataId}/metadata")
    public ResponseEntity<FileMetadataResponse> getFileMetadata(@PathVariable Long fileMetadataId) {
        log.info("Received file metadata request for fileMetadataId: {}", fileMetadataId);

        FileMetadataResponse fileMetadata = fileUploadService.getFileMetadata(fileMetadataId);

        log.info("File metadata retrieved successfully for id: {}", fileMetadataId);
        return ResponseEntity.ok(fileMetadata);
    }

    @GetMapping("/responses/{responseId}/files")
    public ResponseEntity<List<FileMetadataResponse>> getFilesByResponse(@PathVariable Long responseId) {
        log.info("Received request to get files for responseId: {}", responseId);

        List<FileMetadataResponse> files = fileUploadService.getFilesByResponseId(responseId);

        log.info("Retrieved {} files for responseId: {}", files.size(), responseId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/questions/{questionId}/files")
    public ResponseEntity<List<FileMetadataResponse>> getFilesByQuestion(@PathVariable Long questionId) {
        log.info("Received request to get files for questionId: {}", questionId);

        List<FileMetadataResponse> files = fileUploadService.getFilesByQuestionId(questionId);

        log.info("Retrieved {} files for questionId: {}", files.size(), questionId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/responses/{responseId}/questions/{questionId}/files")
    public ResponseEntity<List<FileMetadataResponse>> getFilesByResponseAndQuestion(
            @PathVariable Long responseId,
            @PathVariable Long questionId) {
        log.info("Received request to get files for responseId: {} and questionId: {}", responseId, questionId);

        List<FileMetadataResponse> files = fileUploadService.getFilesByResponseAndQuestion(responseId, questionId);

        log.info("Retrieved {} files for responseId: {} and questionId: {}", files.size(), responseId, questionId);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/files/{fileMetadataId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileMetadataId) {
        try {
            log.info("Received file deletion request for fileMetadataId: {}", fileMetadataId);

            fileUploadService.deleteFile(fileMetadataId);

            log.info("File deleted successfully with id: {}", fileMetadataId);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            log.error("Failed to delete file with id: {}", fileMetadataId, e);
            throw new RuntimeException("File deletion failed: " + e.getMessage(), e);
        }
    }
}
