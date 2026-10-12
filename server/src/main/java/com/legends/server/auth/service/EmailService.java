package com.legends.server.auth.service;

import com.legends.server.exception.custom.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String sender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String recipient, String rawCode) {
        String template = loadTemplate();
        String content = template.replace("{{VERIFICATION_CODE}}", rawCode);

        MimeMessage message = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(sender);
            helper.setTo(recipient);
            helper.setSubject("Verify your CaTch email");
            helper.setText(content, true);

            mailSender.send(message);
        } catch (MessagingException | MailException ex) {
            throw new EmailDeliveryException("Unable to send verification email", ex);
        }
    }

    private String loadTemplate() {
        try {

            ClassPathResource resource = new ClassPathResource("templates/email-verification.html");

            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new EmailDeliveryException("Unable to load email template", ex);
        }
    }
}