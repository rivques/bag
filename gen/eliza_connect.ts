// @generated by protoc-gen-connect-es v1.1.4 with parameter "target=ts"
// @generated from file eliza.proto (package connectrpc.eliza.v1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { CloseTradeRequest, CloseTradeResponse, CreateAppRequest, CreateAppResponse, CreateInstanceRequest, CreateInstanceResponse, CreateInstancesRequest, CreateInstancesResponse, CreateItemRequest, CreateItemResponse, CreateRecipeRequest, CreateRecipeResponse, CreateTradeRequest, CreateTradeResponse, DeleteAppRequest, DeleteAppResponse, DeleteInstanceRequest, DeleteInstanceResponse, ReadAppRequest, ReadAppResponse, ReadIdentityRequest, ReadIdentityResponse, ReadInstanceRequest, ReadInstanceResponse, ReadInventoryRequest, ReadInventoryResponse, ReadItemRequest, ReadItemResponse, ReadItemsRequest, ReadItemsResponse, ReadRecipeRequest, ReadRecipeResponse, ReadTradeRequest, ReadTradeResponse, UpdateAppRequest, UpdateAppResponse, UpdateIdentityMetadataRequest, UpdateIdentityMetadataResponse, UpdateInstanceRequest, UpdateInstanceResponse, UpdateItemRequest, UpdateItemResponse, UpdateRecipeRequest, UpdateRecipeResponse, UpdateTradeRequest, UpdateTradeResponse, VerifyKeyRequest, VerifyKeyResponse } from "./eliza_pb.js";
import { MethodKind } from "@bufbuild/protobuf";

/**
 * @generated from service connectrpc.eliza.v1.ElizaService
 */
export const ElizaService = {
  typeName: "connectrpc.eliza.v1.ElizaService",
  methods: {
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateApp
     */
    createApp: {
      name: "CreateApp",
      I: CreateAppRequest,
      O: CreateAppResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateInstances
     */
    createInstances: {
      name: "CreateInstances",
      I: CreateInstancesRequest,
      O: CreateInstancesResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateInstance
     */
    createInstance: {
      name: "CreateInstance",
      I: CreateInstanceRequest,
      O: CreateInstanceResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateItem
     */
    createItem: {
      name: "CreateItem",
      I: CreateItemRequest,
      O: CreateItemResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateRecipe
     */
    createRecipe: {
      name: "CreateRecipe",
      I: CreateRecipeRequest,
      O: CreateRecipeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CreateTrade
     */
    createTrade: {
      name: "CreateTrade",
      I: CreateTradeRequest,
      O: CreateTradeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadIdentity
     */
    readIdentity: {
      name: "ReadIdentity",
      I: ReadIdentityRequest,
      O: ReadIdentityResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadInventory
     */
    readInventory: {
      name: "ReadInventory",
      I: ReadInventoryRequest,
      O: ReadInventoryResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadItem
     */
    readItem: {
      name: "ReadItem",
      I: ReadItemRequest,
      O: ReadItemResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadItems
     */
    readItems: {
      name: "ReadItems",
      I: ReadItemsRequest,
      O: ReadItemsResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadInstance
     */
    readInstance: {
      name: "ReadInstance",
      I: ReadInstanceRequest,
      O: ReadInstanceResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadApp
     */
    readApp: {
      name: "ReadApp",
      I: ReadAppRequest,
      O: ReadAppResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadTrade
     */
    readTrade: {
      name: "ReadTrade",
      I: ReadTradeRequest,
      O: ReadTradeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.ReadRecipe
     */
    readRecipe: {
      name: "ReadRecipe",
      I: ReadRecipeRequest,
      O: ReadRecipeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateIdentityMetadata
     */
    updateIdentityMetadata: {
      name: "UpdateIdentityMetadata",
      I: UpdateIdentityMetadataRequest,
      O: UpdateIdentityMetadataResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateInstance
     */
    updateInstance: {
      name: "UpdateInstance",
      I: UpdateInstanceRequest,
      O: UpdateInstanceResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateItem
     */
    updateItem: {
      name: "UpdateItem",
      I: UpdateItemRequest,
      O: UpdateItemResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateApp
     */
    updateApp: {
      name: "UpdateApp",
      I: UpdateAppRequest,
      O: UpdateAppResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateTrade
     */
    updateTrade: {
      name: "UpdateTrade",
      I: UpdateTradeRequest,
      O: UpdateTradeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.UpdateRecipe
     */
    updateRecipe: {
      name: "UpdateRecipe",
      I: UpdateRecipeRequest,
      O: UpdateRecipeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.DeleteApp
     */
    deleteApp: {
      name: "DeleteApp",
      I: DeleteAppRequest,
      O: DeleteAppResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.DeleteInstance
     */
    deleteInstance: {
      name: "DeleteInstance",
      I: DeleteInstanceRequest,
      O: DeleteInstanceResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.CloseTrade
     */
    closeTrade: {
      name: "CloseTrade",
      I: CloseTradeRequest,
      O: CloseTradeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc connectrpc.eliza.v1.ElizaService.VerifyKey
     */
    verifyKey: {
      name: "VerifyKey",
      I: VerifyKeyRequest,
      O: VerifyKeyResponse,
      kind: MethodKind.Unary,
    },
  }
} as const;

