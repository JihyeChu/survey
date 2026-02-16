package com.forms.service;

import com.forms.dto.FileMetadataResponse;
import com.forms.entity.FileMetadata;
import com.forms.entity.Question;
import com.forms.entity.Response;
import com.forms.repository.FileMetadataRepository;
import com.forms.repository.QuestionRepository;
import com.forms.repository.ResponseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FileUploadService {

    private final FileMetadataRepository fileMetadataRepository;
    private final ResponseRepository responseRepository;
    private final QuestionRepository questionRepository;
    private final FileStorageService fileStorageService;

    /**
     * 임시 파일 업로드 (응답 제출 전)
     */
    public FileMetadataResponse uploadTempFile(String formId, String questionId, MultipartFile file) throws IOException {
        String storedFilename = fileStorageService.saveFile(file);

        FileMetadata fileMetadata = FileMetadata.builder()
                .originalFilename(file.getOriginalFilename())
                .storedFilename(storedFilename)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .tempFormId(formId)
                .tempQuestionId(questionId)
                .build();

        FileMetadata savedMetadata = fileMetadataRepository.save(fileMetadata);
        log.info("Temp file metadata saved with id: {} for formId: {} and questionId: {}",
                 savedMetadata.getId(), formId, questionId);

        return FileMetadataResponse.fromEntity(savedMetadata);
    }

    public FileMetadataResponse uploadFile(Long responseId, Long questionId, MultipartFile file) throws IOException {
        Response response = responseRepository.findById(responseId)
                .orElseThrow(() -> new IllegalArgumentException("Response not found with id: " + responseId));

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + questionId));

        String storedFilename = fileStorageService.saveFile(file);

        FileMetadata fileMetadata = FileMetadata.builder()
                .originalFilename(file.getOriginalFilename())
                .storedFilename(storedFilename)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .response(response)
                .question(question)
                .build();

        FileMetadata savedMetadata = fileMetadataRepository.save(fileMetadata);
        log.info("File metadata saved with id: {} for response: {} and question: {}",
                 savedMetadata.getId(), responseId, questionId);

        return FileMetadataResponse.fromEntity(savedMetadata);
    }

    @Transactional(readOnly = true)
    public byte[] downloadFile(Long fileMetadataId) throws IOException {
        FileMetadata fileMetadata = fileMetadataRepository.findById(fileMetadataId)
                .orElseThrow(() -> new IllegalArgumentException("File metadata not found with id: " + fileMetadataId));

        return fileStorageService.downloadFile(fileMetadata.getStoredFilename());
    }

    @Transactional(readOnly = true)
    public FileMetadataResponse getFileMetadata(Long fileMetadataId) {
        FileMetadata fileMetadata = fileMetadataRepository.findById(fileMetadataId)
                .orElseThrow(() -> new IllegalArgumentException("File metadata not found with id: " + fileMetadataId));

        return FileMetadataResponse.fromEntity(fileMetadata);
    }

    @Transactional(readOnly = true)
    public List<FileMetadataResponse> getFilesByResponseId(Long responseId) {
        return fileMetadataRepository.findByResponseId(responseId)
                .stream()
                .map(FileMetadataResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FileMetadataResponse> getFilesByQuestionId(Long questionId) {
        return fileMetadataRepository.findByQuestionId(questionId)
                .stream()
                .map(FileMetadataResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FileMetadataResponse> getFilesByResponseAndQuestion(Long responseId, Long questionId) {
        return fileMetadataRepository.findByResponseIdAndQuestionId(responseId, questionId)
                .stream()
                .map(FileMetadataResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public void deleteFile(Long fileMetadataId) throws IOException {
        FileMetadata fileMetadata = fileMetadataRepository.findById(fileMetadataId)
                .orElseThrow(() -> new IllegalArgumentException("File metadata not found with id: " + fileMetadataId));

        fileStorageService.deleteFile(fileMetadata.getStoredFilename());
        fileMetadataRepository.delete(fileMetadata);
        log.info("File deleted successfully with id: {}", fileMetadataId);
    }
}
