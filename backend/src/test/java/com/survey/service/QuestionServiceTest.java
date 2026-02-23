package com.survey.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survey.dto.QuestionRequest;
import com.survey.dto.QuestionResponse;
import com.survey.dto.ReorderQuestionsRequest;
import com.survey.entity.Form;
import com.survey.entity.Question;
import com.survey.entity.Section;
import com.survey.repository.FormRepository;
import com.survey.repository.QuestionRepository;
import com.survey.repository.SectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private FormRepository formRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private QuestionService questionService;

    private Form form;
    private Section section;
    private Question question;
    private QuestionRequest questionRequest;

    @BeforeEach
    void setUp() {
        form = Form.builder()
                .id(1L)
                .title("테스트 설문")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        section = Section.builder()
                .id(10L)
                .form(form)
                .title("섹션 1")
                .description("섹션 설명")
                .orderIndex(0)
                .questions(new ArrayList<>())
                .build();

        question = Question.builder()
                .id(1L)
                .form(form)
                .type("SHORT_TEXT")
                .title("이름을 입력하세요")
                .required(true)
                .orderIndex(0)
                .build();

        questionRequest = new QuestionRequest();
        questionRequest.setType("SHORT_TEXT");
        questionRequest.setTitle("이름을 입력하세요");
        questionRequest.setRequired(true);
        questionRequest.setOrderIndex(0);
    }

    @Test
    @DisplayName("질문 생성 성공")
    void createQuestion_Success() {
        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(questionRepository.save(any(Question.class))).willReturn(question);

        QuestionResponse result = questionService.createQuestion(1L, questionRequest);

        assertThat(result).isNotNull();
        assertThat(result.getType()).isEqualTo("SHORT_TEXT");
        assertThat(result.getTitle()).isEqualTo("이름을 입력하세요");
        assertThat(result.getRequired()).isTrue();
        verify(questionRepository).save(any(Question.class));
    }

    @Test
    @DisplayName("존재하지 않는 폼에 질문 생성시 예외 발생")
    void createQuestion_FormNotFound() {
        given(formRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.createQuestion(999L, questionRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("ID로 질문 조회 성공")
    void getQuestionById_Success() {
        given(questionRepository.findById(1L)).willReturn(Optional.of(question));

        QuestionResponse result = questionService.getQuestionById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("이름을 입력하세요");
    }

    @Test
    @DisplayName("존재하지 않는 질문 조회시 예외 발생")
    void getQuestionById_NotFound() {
        given(questionRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.getQuestionById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Question not found");
    }

    @Test
    @DisplayName("질문 수정 성공")
    void updateQuestion_Success() {
        QuestionRequest updateRequest = new QuestionRequest();
        updateRequest.setType("LONG_TEXT");
        updateRequest.setTitle("수정된 질문");
        updateRequest.setRequired(false);
        updateRequest.setOrderIndex(1);

        given(questionRepository.findById(1L)).willReturn(Optional.of(question));
        given(questionRepository.save(any(Question.class))).willAnswer(invocation -> {
            Question q = invocation.getArgument(0);
            return q;
        });

        QuestionResponse result = questionService.updateQuestion(1L, updateRequest);

        assertThat(result.getType()).isEqualTo("LONG_TEXT");
        assertThat(result.getTitle()).isEqualTo("수정된 질문");
        assertThat(result.getRequired()).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 질문 수정시 예외 발생")
    void updateQuestion_NotFound() {
        given(questionRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.updateQuestion(999L, questionRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Question not found");
    }

    @Test
    @DisplayName("질문 삭제 성공 - 루트 레벨")
    void deleteQuestion_Success() {
        given(questionRepository.findById(1L)).willReturn(Optional.of(question));

        questionService.deleteQuestion(1L);

        verify(questionRepository).deleteById(1L);
        verify(questionRepository).decrementOrderIndexAfterDelete(1L, 0);
    }

    @Test
    @DisplayName("질문 삭제 성공 - 섹션 내 질문, orderIndex 재정렬 검증")
    void deleteQuestion_InSection_Success() {
        Question sectionQuestion = Question.builder()
                .id(2L)
                .form(form)
                .section(section)
                .type("SHORT_TEXT")
                .title("섹션 내 질문")
                .required(false)
                .orderIndex(1)
                .build();

        given(questionRepository.findById(2L)).willReturn(Optional.of(sectionQuestion));

        questionService.deleteQuestion(2L);

        verify(questionRepository).deleteById(2L);
        verify(questionRepository).decrementOrderIndexAfterDeleteInSection(10L, 1);
    }

    @Test
    @DisplayName("첨부파일 있는 질문 삭제 시 파일 정리 검증")
    void deleteQuestion_WithAttachment_Success() throws IOException {
        Question questionWithAttachment = Question.builder()
                .id(3L)
                .form(form)
                .type("SHORT_TEXT")
                .title("첨부파일 질문")
                .required(false)
                .orderIndex(0)
                .attachmentFilename("test.pdf")
                .attachmentStoredName("stored-uuid-test.pdf")
                .attachmentContentType("application/pdf")
                .build();

        given(questionRepository.findById(3L)).willReturn(Optional.of(questionWithAttachment));

        questionService.deleteQuestion(3L);

        verify(fileStorageService).deleteFile("stored-uuid-test.pdf");
        verify(questionRepository).deleteById(3L);
    }

    @Test
    @DisplayName("존재하지 않는 질문 삭제시 예외 발생")
    void deleteQuestion_NotFound() {
        given(questionRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.deleteQuestion(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Question not found");
    }

    @Test
    @DisplayName("첨부파일 저장 성공")
    void uploadAttachment_Success() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test-image.png", "image/png", "fake-image-data".getBytes()
        );

        String storedName = "stored-uuid-test-image.png";
        given(questionRepository.findById(1L)).willReturn(Optional.of(question));
        given(fileStorageService.saveFile(any(MultipartFile.class))).willReturn(storedName);
        given(questionRepository.save(any(Question.class))).willAnswer(invocation -> {
            Question q = invocation.getArgument(0);
            return q;
        });

        QuestionResponse result = questionService.uploadAttachment(1L, file);

        assertThat(result).isNotNull();
        assertThat(result.getAttachmentFilename()).isEqualTo("test-image.png");
        assertThat(result.getAttachmentStoredName()).isEqualTo(storedName);
        assertThat(result.getAttachmentContentType()).isEqualTo("image/png");
        verify(fileStorageService).saveFile(file);
        verify(questionRepository).save(any(Question.class));
    }

    @Test
    @DisplayName("기존 첨부파일 있을 때 새 파일 업로드 시 이전 파일 삭제 검증")
    void uploadAttachment_ReplacesExisting() throws IOException {
        Question questionWithExistingAttachment = Question.builder()
                .id(4L)
                .form(form)
                .type("SHORT_TEXT")
                .title("기존 첨부파일 질문")
                .required(false)
                .orderIndex(0)
                .attachmentFilename("old.pdf")
                .attachmentStoredName("old-stored.pdf")
                .attachmentContentType("application/pdf")
                .build();

        MockMultipartFile newFile = new MockMultipartFile(
                "file", "new.pdf", "application/pdf", "new-pdf-data".getBytes()
        );

        given(questionRepository.findById(4L)).willReturn(Optional.of(questionWithExistingAttachment));
        given(fileStorageService.saveFile(any(MultipartFile.class))).willReturn("new-stored.pdf");
        given(questionRepository.save(any(Question.class))).willAnswer(invocation -> invocation.getArgument(0));

        questionService.uploadAttachment(4L, newFile);

        verify(fileStorageService).deleteFile("old-stored.pdf");
        verify(fileStorageService).saveFile(newFile);
    }

    @Test
    @DisplayName("Order 재정렬 성공 - 섹션 간 이동 포함")
    void reorderQuestions_Success() {
        Question q1 = Question.builder().id(1L).form(form).orderIndex(0).build();
        Question q2 = Question.builder().id(2L).form(form).section(section).orderIndex(0).build();

        ReorderQuestionsRequest request = new ReorderQuestionsRequest();
        List<ReorderQuestionsRequest.QuestionOrder> orders = new ArrayList<>();

        ReorderQuestionsRequest.QuestionOrder order1 = new ReorderQuestionsRequest.QuestionOrder();
        order1.setId(1L);
        order1.setOrder(1);
        order1.setSectionId(null);

        ReorderQuestionsRequest.QuestionOrder order2 = new ReorderQuestionsRequest.QuestionOrder();
        order2.setId(2L);
        order2.setOrder(0);
        order2.setSectionId(10L);

        orders.add(order1);
        orders.add(order2);
        request.setQuestions(orders);

        given(questionRepository.findAllById(List.of(1L, 2L))).willReturn(List.of(q1, q2));
        given(sectionRepository.findAllById(List.of(10L))).willReturn(List.of(section));
        given(questionRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));

        questionService.reorderQuestions(request);

        assertThat(q1.getOrderIndex()).isEqualTo(1);
        assertThat(q2.getOrderIndex()).isEqualTo(0);
        assertThat(q2.getSection()).isEqualTo(section);
        verify(questionRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Order 재정렬 - 빈 리스트는 무시")
    void reorderQuestions_EmptyList() {
        ReorderQuestionsRequest request = new ReorderQuestionsRequest();
        request.setQuestions(Collections.emptyList());

        questionService.reorderQuestions(request);

        verify(questionRepository, never()).saveAll(anyList());
    }
}
