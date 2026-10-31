package com.legends.server.relative.controller;

import com.legends.server.auth.dto.response.AuthResponse;
import com.legends.server.relative.dto.request.InviteRelativeRequest;
import com.legends.server.relative.dto.response.LinkedUserResponse;
import com.legends.server.relative.dto.response.RelativeInvitationResponse;
import com.legends.server.relative.dto.response.RelativeResponse;
import com.legends.server.relative.service.RelativeService;
import com.legends.server.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/relatives")
public class RelativeController {

    private final RelativeService relativeService;

    public RelativeController(RelativeService relativeService) {
        this.relativeService = relativeService;
    }

    // inviting side: a user who shares their devices, and stays able to do so after becoming a relative

    @PostMapping("/invitations")
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<RelativeResponse> inviteRelative(@Valid @RequestBody InviteRelativeRequest request, @CurrentUser Long userId) {
        RelativeResponse response = relativeService.inviteRelative(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<Page<RelativeResponse>> getMyRelatives(@CurrentUser Long userId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<RelativeResponse> response = relativeService.getMyRelatives(userId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @DeleteMapping("/{relativeId}")
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<Void> removeRelative(@PathVariable Long relativeId, @CurrentUser Long userId) {
        relativeService.removeRelative(relativeId, userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    // invited side: incoming invitations, which a relative can keep receiving

    @GetMapping("/invitations")
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<Page<RelativeInvitationResponse>> getMyInvitations(@CurrentUser Long relativeId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<RelativeInvitationResponse> response = relativeService.getMyInvitations(relativeId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PostMapping("/invitations/{invitationId}/accept")
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<AuthResponse> acceptInvitation(@PathVariable Long invitationId, @CurrentUser Long relativeId) {
        AuthResponse response = relativeService.acceptInvitation(invitationId, relativeId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PostMapping("/invitations/{invitationId}/decline")
    @PreAuthorize("hasAnyRole('USER', 'RELATIVE')")
    public ResponseEntity<Void> declineInvitation(@PathVariable Long invitationId, @CurrentUser Long relativeId) {
        relativeService.declineInvitation(invitationId, relativeId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    // relative side: users whose invitations were accepted

    @GetMapping("/users")
    @PreAuthorize("hasRole('RELATIVE')")
    public ResponseEntity<Page<LinkedUserResponse>> getLinkedUsers(@CurrentUser Long relativeId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<LinkedUserResponse> response = relativeService.getLinkedUsers(relativeId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasRole('RELATIVE')")
    public ResponseEntity<Void> unlinkUser(@PathVariable Long userId, @CurrentUser Long relativeId) {
        relativeService.unlinkUser(userId, relativeId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
