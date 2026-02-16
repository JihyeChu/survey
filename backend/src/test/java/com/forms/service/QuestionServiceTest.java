package com.forms.service;

import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private FormRepository formRepository;

    @InjectMocks
    private QuestionService questionService;

    private Form form;
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

        question = Question.builder()
                .id(1L)
                .form(form)
                .type("SHORT_TEXT")
                .title("이름을 입력하세요")
                .required(true)
                .orderIndex(0)
                .options(new ArrayList<>())
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
    @DisplayName("질문 삭제 성공")
    void deleteQuestion_Success() {
        given(questionRepository.existsById(1L)).willReturn(true);

        questionService.deleteQuestion(1L);

        verify(questionRepository).deleteById(1L);
    }

    @Test
    @DisplayName("존재하지 않는 질문 삭제시 예외 발생")
    void deleteQuestion_NotFound() {
        given(questionRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> questionService.deleteQuestion(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Question not found");
    }
}
